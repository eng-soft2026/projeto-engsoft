import { getPrisma } from "../lib/prisma.js";

export const PUBLIC_USER_FIELDS = Object.freeze({
    id: true,
    name: true,
    email: true,
    cpf: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
});

const CREDENTIAL_FIELDS = Object.freeze({
    ...PUBLIC_USER_FIELDS,
    passwordHash: true,
});

export function createUserRepository(getClient = getPrisma) {
    return Object.freeze({
        findById(id) {
            return getClient().user.findUnique({
                where: { id },
                select: PUBLIC_USER_FIELDS,
            });
        },

        findByEmail(email) {
            return getClient().user.findUnique({
                where: { email },
                select: PUBLIC_USER_FIELDS,
            });
        },

        findByCpf(cpf) {
            return getClient().user.findUnique({
                where: { cpf },
                select: PUBLIC_USER_FIELDS,
            });
        },

        findCredentialsByEmail(email) {
            return getClient().user.findUnique({
                where: { email },
                select: CREDENTIAL_FIELDS,
            });
        },

        findCredentialsById(id) {
            return getClient().user.findUnique({
                where: { id },
                select: CREDENTIAL_FIELDS,
            });
        },

        async existsByEmailOrCpf({ email, cpf }) {
            const user = await getClient().user.findFirst({
                where: { OR: [{ email }, { cpf }] },
                select: { id: true },
            });
            return user !== null;
        },

        create(data) {
            return getClient().user.create({
                data,
                select: PUBLIC_USER_FIELDS,
            });
        },

        update(id, data) {
            return getClient().user.update({
                where: { id },
                data,
                select: PUBLIC_USER_FIELDS,
            });
        },
    });
}

export const userRepository = createUserRepository();
