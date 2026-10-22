import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ChatOllama } from '@langchain/ollama';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
    EmbeddingStatus,
    gapTypeEnum,
    GapType,
    jobRequirements,
    jobs,
    matchStatusEnum,
    MatchStatus,
    resumeChunks,
    resumeMatches,
    resumeMatchItems,
    userResumes,
    UserRole
} from 'src/db/schema';
import { CreateMatchDto } from './dto/createMatch.dto';
import { matchSystemPrompt } from './prompts/match.prompt';
import { matchJsonSchema } from './schema/match.schema';

@Injectable()
export class MatchesService {
    private ai: ChatOllama;

    constructor(
        @InjectDrizzle()
        private readonly db: NodePgDatabase
    ) {
        this.ai = new ChatOllama({
            model: "llama3.2:1b",
            baseUrl: "http://localhost:11434",
            temperature: 0.1,
        });
    }

    private cleanAlignmentText(val: any, fallback: string): string {
        if (!val) return fallback;
        if (typeof val === 'string') {
            const trimmed = val.trim();
            // Check if LLM returned serialized JSON array or object
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        return parsed
                            .map((item: any) => {
                                if (typeof item === 'string') return item;
                                if (item.role && item.company) return `${item.role} at ${item.company}`;
                                if (item.degree && item.institution) return `${item.degree} from ${item.institution}`;
                                return JSON.stringify(item);
                            })
                            .join('; ');
                    } else if (typeof parsed === 'object') {
                        return Object.values(parsed).filter(Boolean).join('. ');
                    }
                } catch {
                    // if parse fails, return stripped string
                    return trimmed.replace(/[\[\]{}"\\]/g, ' ').replace(/\s+/g, ' ').trim();
                }
            }
            return trimmed;
        } else if (Array.isArray(val)) {
            return val
                .map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item.role && item.company) return `${item.role} at ${item.company}`;
                    if (item.degree && item.institution) return `${item.degree} from ${item.institution}`;
                    return '';
                })
                .filter(Boolean)
                .join('; ') || fallback;
        }
        return String(val);
    }

    private calculateDeterministicScore(items: any[]): number {
        if (!items || items.length === 0) return 50;

        let totalWeight = 0;
        let earnedPoints = 0;

        for (const item of items) {
            // Weight based on requirement type
            let weight = 1;
            if (item.type === "required_skill") weight = 3;
            else if (item.type === "responsibility") weight = 2;
            else if (item.type === "nice_to_have") weight = 1;

            totalWeight += weight;

            if (item.status === MatchStatus.MATCHED) {
                earnedPoints += weight * 1.0;
            } else if (item.status === MatchStatus.PARTIAL) {
                earnedPoints += weight * 0.55;
            } else {
                // missing
                if (item.topSimilarity >= 0.40) {
                    earnedPoints += weight * 0.25;
                }
            }
        }

        return Math.min(100, Math.max(0, Math.round((earnedPoints / totalWeight) * 100)));
    }

    async createMatch(request: any, data: CreateMatchDto) {
        const userId = request?.user?.id;
        const userRole = request?.user?.role;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED);
        }

        const { jobId, resumeId } = data;

        try {
            // Verify Job exists and is published & embeddings ready
            const [job] = await this.db.select()
                .from(jobs)
                .where(eq(jobs.id, jobId));

            if (!job) {
                return {
                    status: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: "Job not found"
                };
            }

            if (job.embeddingStatus !== EmbeddingStatus.READY) {
                return {
                    status: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: "Job embeddings are still processing. Please try again shortly."
                };
            }

            // Verify Candidate owns resume if user is candidate
            const resumeWhereCondition = userRole === UserRole.CANDIDATE
                ? and(eq(userResumes.id, resumeId), eq(userResumes.userId, userId))
                : eq(userResumes.id, resumeId);

            const [resume] = await this.db.select()
                .from(userResumes)
                .where(resumeWhereCondition);

            if (!resume) {
                return {
                    status: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: "Resume not found"
                };
            }

            if (resume.embeddingStatus !== EmbeddingStatus.READY) {
                return {
                    status: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: "Resume embeddings are still processing. Please try again shortly."
                };
            }

            // Fetch Job Requirements
            const requirements = await this.db.select()
                .from(jobRequirements)
                .where(eq(jobRequirements.jobId, jobId))
                .orderBy(jobRequirements.position);

            if (!requirements || requirements.length === 0) {
                return {
                    status: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: "No requirements found for this job"
                };
            }

            // RAG Step: Vector similarity search for each requirement against resume chunks
            const ragContextList: any[] = [];

            for (const req of requirements) {
                const reqEmbeddingStr = JSON.stringify(req.embedding);

                // Cosine similarity in pgvector: 1 - cosine_distance
                const matchingChunks = await this.db.select({
                    id: resumeChunks.id,
                    section: resumeChunks.section,
                    content: resumeChunks.content,
                    similarity: sql<number>`1 - (${resumeChunks.embedding} <=> ${reqEmbeddingStr}::vector)`
                })
                    .from(resumeChunks)
                    .where(eq(resumeChunks.resumeId, resumeId))
                    .orderBy(sql`${resumeChunks.embedding} <=> ${reqEmbeddingStr}::vector`)
                    .limit(3);

                const topSimilarity = matchingChunks.length > 0 ? Math.max(0, Number(matchingChunks[0].similarity)) : 0;

                ragContextList.push({
                    requirementId: req.id,
                    text: req.text,
                    type: req.type,
                    topSimilarity: Number(topSimilarity.toFixed(4)),
                    evidenceChunks: matchingChunks.map((chunk) => ({
                        id: chunk.id,
                        section: chunk.section,
                        content: chunk.content,
                        similarity: Number(Number(chunk.similarity).toFixed(4))
                    }))
                });
            }

            // LLM Evaluation of RAG retrieved context
            const analysis = await this.evaluateMatchWithLLM(job, resume, ragContextList);

            // Build individual item classifications
            const evaluatedItems = ragContextList.map((ragReq) => {
                const evalItem = (analysis?.items || []).find((it: any) => it.requirementId === ragReq.requirementId);

                let status: MatchStatus = MatchStatus.MISSING;
                if (evalItem?.status === "matched") status = MatchStatus.MATCHED;
                else if (evalItem?.status === "partial") status = MatchStatus.PARTIAL;
                else if (ragReq.topSimilarity >= 0.70) status = MatchStatus.MATCHED;
                else if (ragReq.topSimilarity >= 0.48) status = MatchStatus.PARTIAL;

                let gapType: GapType | null = null;
                if (evalItem?.gapType === "wording_gap") gapType = GapType.WORDING_GAP;
                else if (evalItem?.gapType === "skill_gap") gapType = GapType.SKILL_GAP;
                else if (status !== MatchStatus.MATCHED) {
                    gapType = ragReq.topSimilarity >= 0.45 ? GapType.WORDING_GAP : GapType.SKILL_GAP;
                }

                const evidenceChunkIds = ragReq.evidenceChunks.map((c: any) => c.id);
                const defaultEvidence = ragReq.evidenceChunks.length > 0
                    ? ragReq.evidenceChunks.map((c: any) => `[${c.section}] ${c.content}`).join("\n")
                    : "No relevant experience found in resume.";

                return {
                    requirementId: ragReq.requirementId,
                    type: ragReq.type,
                    status: status,
                    topSimilarity: ragReq.topSimilarity,
                    evidence: evalItem?.evidence || defaultEvidence,
                    evidenceChunkIds: evidenceChunkIds,
                    gapType: gapType,
                    suggestion: evalItem?.suggestion || (status === MatchStatus.MATCHED ? "Well presented in resume." : `Consider adding experience or projects demonstrating ${ragReq.text}.`)
                };
            });

            // Calculate reliable score
            let finalScore = 0;
            if (analysis && typeof analysis.matchScore === 'number' && analysis.matchScore > 0) {
                finalScore = analysis.matchScore <= 1 ? Math.round(analysis.matchScore * 100) : Math.round(analysis.matchScore);
            } else {
                finalScore = this.calculateDeterministicScore(evaluatedItems);
            }

            // Sanitize text alignments
            const experienceAlignment = this.cleanAlignmentText(
                analysis?.experienceAlignment,
                `Candidate's background demonstrates alignment with key technical responsibilities for ${job.title}.`
            );

            const educationAlignment = this.cleanAlignmentText(
                analysis?.educationAlignment,
                `Candidate's educational qualifications satisfy baseline position requirements.`
            );

            const overallFeedback = Array.isArray(analysis?.overallFeedback) && analysis.overallFeedback.length > 0
                ? analysis.overallFeedback
                : [
                    `Overall profile match score: ${finalScore}%.`,
                    `Evaluated across ${requirements.length} job requirements.`,
                    `Review individual requirement items to address wording and skill gaps.`
                ];

            // Save match parent record
            const [savedMatch] = await this.db.insert(resumeMatches).values({
                userId: resume.userId,
                resumeId: resume.id,
                jobId: job.id,
                matchScore: finalScore,
                experienceAlignment: experienceAlignment,
                educationAlignment: educationAlignment,
                overallFeedback: overallFeedback
            }).returning();

            // Save individual requirement match items
            const itemInserts = evaluatedItems.map((item) => ({
                matchId: savedMatch.id,
                requirementId: item.requirementId,
                status: item.status,
                topSimilarity: item.topSimilarity,
                evidence: item.evidence,
                evidenceChunkIds: item.evidenceChunkIds,
                gapType: item.gapType,
                suggestion: item.suggestion
            }));

            await this.db.insert(resumeMatchItems).values(itemInserts);

            // Group requirements into clean matched, partial, and missing summaries
            const matchedSkills: string[] = [];
            const partialSkills: string[] = [];
            const missingSkills: string[] = [];

            for (const item of evaluatedItems) {
                const req = requirements.find((r) => r.id === item.requirementId);
                const text = req?.text || item.requirementId;

                if (item.status === MatchStatus.MATCHED) {
                    matchedSkills.push(text);
                } else if (item.status === MatchStatus.PARTIAL) {
                    partialSkills.push(text);
                } else {
                    missingSkills.push(text);
                }
            }

            return {
                status: true,
                statusCode: HttpStatus.CREATED,
                data: {
                    id: savedMatch.id,
                    jobId: savedMatch.jobId,
                    resumeId: savedMatch.resumeId,
                    matchScore: savedMatch.matchScore,
                    experienceAlignment: savedMatch.experienceAlignment,
                    educationAlignment: savedMatch.educationAlignment,
                    overallFeedback: savedMatch.overallFeedback,
                    matchedSkills,
                    partialSkills,
                    missingSkills,
                    createdAt: savedMatch.createdAt
                },
                message: "Resume matched against job successfully"
            };

        } catch (error) {
            console.error("Match creation error:", error);
            throw new HttpException("Something went wrong while matching resume with job", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private async evaluateMatchWithLLM(job: any, resume: any, ragContextList: any[]) {
        try {
            // Filter and compact context to prevent LLM hallucination / timeout
            const compactContext = ragContextList.map(r => ({
                requirementId: r.requirementId,
                requirement: r.text,
                type: r.type,
                similarity: r.topSimilarity,
                topEvidence: r.evidenceChunks.map((c: any) => `(${c.section}): ${c.content}`).join(" | ")
            }));

            const prompt = `
Job Title: ${job.title}
Job Overview: ${job.description}

Candidate Skills: ${(resume.skills || []).join(", ")}
Candidate Summary: ${resume.summary || "Not specified"}

Job Requirements with candidate's retrieved resume evidence chunks:
${JSON.stringify(compactContext, null, 2)}

Please analyze the match. Return a valid JSON matching the schema with:
- "matchScore" (integer 0-100)
- "experienceAlignment" (prose text sentence, NO raw JSON arrays)
- "educationAlignment" (prose text sentence, NO raw JSON arrays)
- "overallFeedback" (array of 2-4 strings)
- "items" (array with requirementId, status, gapType, evidence, suggestion)
`;

            const structuredAi = this.ai.withStructuredOutput(matchJsonSchema);
            const response: any = await structuredAi.invoke([
                { role: "system", content: matchSystemPrompt },
                { role: "user", content: prompt }
            ]);

            return response;
        } catch (error) {
            console.error("LLM Match evaluation error:", error);
            return null;
        }
    }

    async getMatchById(request: any, matchId: string) {
        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED);
        }

        try {
            const [match] = await this.db.select()
                .from(resumeMatches)
                .where(eq(resumeMatches.id, matchId));

            if (!match) {
                return {
                    status: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: "Match not found"
                };
            }

            // Fetch related items with requirement details
            const items = await this.db.select({
                id: resumeMatchItems.id,
                matchId: resumeMatchItems.matchId,
                requirementId: resumeMatchItems.requirementId,
                status: resumeMatchItems.status,
                topSimilarity: resumeMatchItems.topSimilarity,
                evidence: resumeMatchItems.evidence,
                evidenceChunkIds: resumeMatchItems.evidenceChunkIds,
                gapType: resumeMatchItems.gapType,
                suggestion: resumeMatchItems.suggestion,
                createdAt: resumeMatchItems.createdAt,
                requirementText: jobRequirements.text,
                requirementType: jobRequirements.type
            })
                .from(resumeMatchItems)
                .innerJoin(jobRequirements, eq(resumeMatchItems.requirementId, jobRequirements.id))
                .where(eq(resumeMatchItems.matchId, matchId));

            return {
                status: true,
                statusCode: HttpStatus.OK,
                data: {
                    ...match,
                    items
                },
                message: "Match fetched successfully"
            };

        } catch (error) {
            console.error(error);
            throw new HttpException("Something went wrong while fetching match", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getUserMatches(request: any, resumeId?: string, jobId?: string) {
        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED);
        }

        try {
            const conditions = [eq(resumeMatches.userId, userId)];

            if (resumeId) {
                conditions.push(eq(resumeMatches.resumeId, resumeId));
            }
            if (jobId) {
                conditions.push(eq(resumeMatches.jobId, jobId));
            }

            const matches = await this.db.select()
                .from(resumeMatches)
                .where(and(...conditions))
                .orderBy(desc(resumeMatches.createdAt));

            return {
                status: true,
                statusCode: HttpStatus.OK,
                data: matches,
                message: "Matches fetched successfully"
            };

        } catch (error) {
            console.error(error);
            throw new HttpException("Something went wrong while fetching matches", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
