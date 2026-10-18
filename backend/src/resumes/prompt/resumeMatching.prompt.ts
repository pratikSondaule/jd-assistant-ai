export const resumeMatchPrompt = (
    resumeData: unknown,
    jobData: unknown,
) => `
You are an expert technical recruiter and resume evaluator.

Compare the candidate's resume with the job description.

RESUME:
${JSON.stringify(resumeData, null, 2)}

JOB DESCRIPTION:
${JSON.stringify(jobData, null, 2)}

Evaluate the candidate using these weighted criteria:
- Required skills: 50%
- Relevant work experience: 25%
- Project relevance: 15%
- Education and certifications: 10%

Scoring instructions:
- Return an integer matchScore from 0 to 100.
- Follow the weighted rubric when assigning the score.
- Mark a skill as "matched" when there is clear evidence of proficiency.
- Mark a skill as "partial" when the evidence is related but incomplete.
- Mark a skill as "missing" when there is no sufficient evidence.
- Evaluate equivalent technologies and transferable skills fairly.
- Do not invent qualifications, experience, projects, or certifications.
- Base conclusions only on the supplied data.
- Keep matchingSkills and missingSkills consistent with the assessment.
- Provide concise, actionable feedback.
- Return only the structured JSON response matching the provided schema.
`;
