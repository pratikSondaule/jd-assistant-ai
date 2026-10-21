export const resumeJsonSchema = {
    type: "object",
    properties: {
        valid: {
            type: "boolean"
        },
        message: {
            type: "string"
        },
        summary: {
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
        projects: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: {
                        type: "string"
                    },
                    responsibilities: {
                        type: "array",
                        items: {
                            type: "string"
                        }
                    },
                    techStack: {
                        type: "array",
                        items: {
                            type: "string"
                        }
                    }
                },
                required: [
                    "name",
                    "description",
                    "techStack"
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
        "valid",
        "message",
        "summary",
        "skills",
        "experience",
        "education",
    ]
}