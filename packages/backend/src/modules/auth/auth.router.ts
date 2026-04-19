import { Router, Request, Response } from 'express';
import { validate } from '../../middleware/validate';
import { RegisterSchema, LoginSchema } from '@gastos/shared';
import { loginUser, registerUser, seedCategoriesForUser } from './auth.service';

const router = Router();

router.post('/register', validate(RegisterSchema), async (req: Request, res: Response) => {
  try {
    const result = await registerUser(req.body.email, req.body.password, req.body.name);
    seedCategoriesForUser(result.user.id);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.post('/login', validate(LoginSchema), async (req: Request, res: Response) => {
  try {
    const result = await loginUser(req.body.email, req.body.password);
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

export default router;
