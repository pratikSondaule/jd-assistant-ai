export const jdJsonSchema = {
    type: "object",
    properties: {
        valid: {
            type: "boolean"
        },
        message: {
            type: "string"
        },
        jobTitle: {
            type: "string",
        },
        company: {
            type: "string",
        },
        location: {
            type: "string",
        },
        experience: {
            type: "string",
        },
        salaryRange: {
            type: "string",
        },
        employmentType: {
            type: "string",
        },
        responsibilities: {
            type: "array",
            items: { type: "string" }
        },
        requiredSkills: {
            type: "array",
            items: { type: "string" }
        },
        niceToHaveSkills: {
            type: "array",
            items: { type: "string" }
        },
        education: {
            type: "string",
        }
    },
    required: [
        "valid",
        "message",
        "jobTitle",
        "company",
        "location",
        "experience",
        "salaryRange",
        "employmentType",
        "responsibilities",
        "requiredSkills",
        "niceToHaveSkills",
        "education"
    ]
}