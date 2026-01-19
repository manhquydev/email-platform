/**
 * Types, schema, and hooks for Register page
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

/** Zod validation schema for registration form */
export const registerSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
});

export type RegisterForm = z.infer<typeof registerSchema>;

/** Password strength result */
export interface PasswordStrength {
    score: number;
    label: string;
    color: string;
}

/** Calculate password strength based on complexity rules */
export function getPasswordStrength(password: string): PasswordStrength {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: 'Yếu', color: '#ff4444' };
    if (score <= 3) return { score: 2, label: 'Trung bình', color: '#ffbb33' };
    return { score: 3, label: 'Mạnh', color: '#00C851' };
}

/** Hook to manage register form state and submission */
export function useRegisterForm() {
    const [busy, setBusy] = useState(false);
    const [passwordValue, setPasswordValue] = useState('');
    const [registered, setRegistered] = useState(false);
    const { token } = useAuth();

    const form = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterForm) => {
        setBusy(true);
        try {
            const res = await api<{ message: string }>("/auth/register", {
                method: "POST",
                body: { email: data.email, password: data.password },
            });
            toast.success(res.message || "Đăng ký thành công!");
            setRegistered(true);
        } catch (e) {
            toast.error((e as Error).toString());
        } finally {
            setBusy(false);
        }
    };

    const strength = getPasswordStrength(passwordValue);

    return {
        busy,
        passwordValue,
        setPasswordValue,
        registered,
        token,
        form,
        strength,
        onSubmit,
    };
}
