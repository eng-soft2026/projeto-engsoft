import { ERROR_CODES, ValidationError } from "./errors.js";

export function parseWithSchema(schema, input) {
    const result = schema.safeParse(input);
    if (result.success) {
        return result.data;
    }

    const [firstIssue] = result.error.issues;
    const code = firstIssue.params?.errorCode ?? ERROR_CODES.VALIDATION_ERROR;
    throw new ValidationError(firstIssue.message, code);
}
