import express, { type Request, type Response } from 'express';
import { compare, hash } from 'bcryptjs';
import {
    MongoClient,
    MongoServerError,
    ObjectId,
    type Collection,
} from 'mongodb';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

interface User {
    name: string;
    email: string;
    password: string;
}

const signupBody = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    password: z.string().min(8),
});

const signinBody = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});

const JWT_SECRET = process.env.AUTH_TOKEN_SECRET;
let usersCollection: Collection<User> | undefined;

export function createAuthToken(userId: string, displayName?: string) {
    if (!JWT_SECRET) {
        throw new Error('AUTH_TOKEN_SECRET is not set');
    }

    return jwt.sign({ userId, ...(displayName ? { displayName } : {}) }, JWT_SECRET, {
        expiresIn: '1h',
    });
}

export async function getAuthDisplayName(token: string): Promise<string> {
    if (!JWT_SECRET) {
        throw new Error('AUTH_TOKEN_SECRET is not set');
    }

    const payload = jwt.verify(token, JWT_SECRET);
    if (
        typeof payload === 'object' &&
        payload !== null &&
        typeof payload.displayName === 'string' &&
        payload.displayName.trim().length > 0
    ) {
        return payload.displayName.trim().slice(0, 50);
    }

    if (
        typeof payload !== 'object' ||
        payload === null ||
        typeof payload.userId !== 'string' ||
        !ObjectId.isValid(payload.userId) ||
        !usersCollection
    ) {
        throw new Error('Could not resolve the authenticated user name');
    }

    const user = await usersCollection.findOne(
        { _id: new ObjectId(payload.userId) },
        { projection: { name: 1 } },
    );
    if (!user?.name.trim()) {
        throw new Error('Could not resolve the authenticated user name');
    }

    return user.name.trim().slice(0, 50);
}

export function verifyAuthToken(token: string) {
    if (!JWT_SECRET) {
        throw new Error('AUTH_TOKEN_SECRET is not set');
    }

    try {
        jwt.verify(token, JWT_SECRET);
        return true;
    } catch (error) {
        if (
            error instanceof jwt.JsonWebTokenError ||
            error instanceof jwt.TokenExpiredError
        ) {
            return false;
        }
        throw error;
    }
}

function userRoute(users: Collection<User>) {
    const router = express.Router();

    // Signup
    router.post('/signup', async (req: Request, res: Response) => {
        const { success, data } = signupBody.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: 'Invalid request body' });
        }

        const email = data.email.toLowerCase();
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const user = {
            name: data.name,
            email,
            password: await hash(data.password, 10),
        };

        try {
            const result = await users.insertOne(user);
            const token = createAuthToken(result.insertedId.toString(), user.name);
            return res.status(201).json({ message: 'User created successfully', token });
        } catch (error) {
            if (error instanceof MongoServerError && error.code === 11000) {
                return res.status(400).json({ message: 'Email already exists' });
            }
            console.error('Signup failed:', error);
            return res.status(500).json({ message: 'Could not create account' });
        }
    });

    // Signin
    router.post('/signin', async (req: Request, res: Response) => {
        const { success, data } = signinBody.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: 'Invalid request body' });
        }

        const email = data.email.toLowerCase();
        const user = await users.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isPasswordCorrect = await compare(data.password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: 'Incorrect password' });
        }

        const token = createAuthToken(user._id.toString(), user.name);
        return res.status(200).json({ token });
    });

    return router;
}

export async function startUserRoutes() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI is not set');
    }
    if (!JWT_SECRET || new TextEncoder().encode(JWT_SECRET).length < 32) {
        throw new Error('AUTH_TOKEN_SECRET must be at least 32 bytes long');
    }

    const mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();

    const users = mongoClient
        .db(process.env.MONGODB_DATABASE || 'roomcast')
        .collection<User>('users');
    usersCollection = users;
    await users.createIndex({ email: 1 }, { unique: true });

    const app = express();
    const frontendOrigin =
        process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', frontendOrigin);
        res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
        next();
    });
    app.use(express.json());
    app.use('/api/users', userRoute(users));

    const port = Number(process.env.AUTH_PORT || 3002);
    app.listen(port, () => {
        console.log(`User routes running on port ${port}`);
    });
}
