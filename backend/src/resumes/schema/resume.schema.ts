export const resumeJsonSchema = {
    type: "object",
    properties: {
        aiSummary: {
            type: "string"
        },
        skills: {
            type: "array",
            items: {
                type: "string"
            }
        },
        experience: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    company: {
                        type: "string"
                    },
                    role: {
                        type: "string"
                    },
                    duration: {
                        type: "string"
                    },
                    responsibilities: {
                        type: "array",
                        items: {
                            type: "string"
                        }
                    }
                },
                required: [
                    "company",
                    "role",
                    "duration",
                    "responsibilities"
                ]
            }
        },
        education: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    degree: {
                        type: "string"
                    },
                    institution: {
                        type: "string"
                    },
                    graduationYear: {
                        type: "string"
                    }
                },
                required: [
                    "degree",
                    "institution",
                    "graduationYear"
                ]
            }
        },
        certificates: {
            type: "array",
            items: {
                type: "string"
            }
        }
    },
    required: [
        "aiSummary",
        "skills",
        "experience",
        "education",
    ]
}