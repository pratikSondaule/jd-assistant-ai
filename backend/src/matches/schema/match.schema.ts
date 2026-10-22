export const matchJsonSchema = {
    type: "object",
    properties: {
        matchScore: {
            type: "integer",
            description: "Overall match score from 0 to 100"
        },
        experienceAlignment: {
            type: "string",
            description: "Narrative 1-3 sentences evaluating work experience alignment"
        },
        educationAlignment: {
            type: "string",
            description: "Narrative 1-2 sentences evaluating educational alignment"
        },
        overallFeedback: {
            type: "array",
            items: {
                type: "string"
            },
            description: "List of 2-4 feedback bullet points"
        },
        items: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    requirementId: {
                        type: "string"
                    },
                    status: {
                        type: "string",
                        enum: ["matched", "partial", "missing"]
                    },
                    gapType: {
                        type: "string",
                        enum: ["wording_gap", "skill_gap", "none"]
                    },
                    evidence: {
                        type: "string"
                    },
                    suggestion: {
                        type: "string"
                    }
                },
                required: [
                    "requirementId",
                    "status",
                    "evidence"
                ]
            }
        }
    },
    required: [
        "matchScore",
        "experienceAlignment",
        "educationAlignment",
        "overallFeedback",
        "items"
    ]
};
