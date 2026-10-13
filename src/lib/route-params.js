import { parseWithSchema } from "./validation.js";

export async function parseRouteParams(context, schema) {
    const params = await context.params;
    return parseWithSchema(schema, params);
}
