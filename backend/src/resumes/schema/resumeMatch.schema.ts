export const resumeMatchSchema = {
    type: 'object',
    properties: {
        requiredSkills: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    skill: { type: 'string' },
                    status: {
                        type: 'string',
                        enum: ['matched', 'partial', 'missing'],
                    },
                    evidence: { type: 'string' },
                },
                required: ['skill', 'status', 'evidence'],
            },
        },

        matchingSkills: {
            type: 'array',
            items: { type: 'string' },
        },

        missingSkills: {
            type: 'array',
            items: { type: 'string' },
        },

        niceToHaveSkills: {
            type: 'array',
            items: { type: 'string' },
        },

        experienceAlignment: {
            type: 'string',
        },

        educationAlignment: {
            type: 'string',
        },

        overallFeedback: {
            type: 'array',
            items: { type: 'string' },
        },

        matchScore: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
        }
    },

    required: [
        'requiredSkills',
        'matchingSkills',
        'missingSkills',
        'niceToHaveSkills',
        'experienceAlignment',
        'educationAlignment',
        'overallFeedback',
        'matchScore'
    ],
};