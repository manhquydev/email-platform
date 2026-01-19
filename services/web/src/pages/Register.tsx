/**
 * Register - User registration page
 * Modules extracted to register-modules/
 */
import { Link, Navigate } from "react-router-dom";
import { GlassCard } from "../components/ui/GlassCard";
import {
    useRegisterForm,
    BrandLogo,
    TermsCheckbox,
    TelegramHint,
    RegisterFormInputs,
    SubmitButton,
    HeroSection,
    SecurityBadge,
    LoginLink
} from "./register-modules";

export function Register() {
    const {
        busy,
        passwordValue,
        setPasswordValue,
        registered,
        token,
        form,
        strength,
        onSubmit
    } = useRegisterForm();

    const { register, handleSubmit, formState: { errors } } = form;

    if (token) return <Navigate to="/app" replace />;
    if (registered) return <Navigate to="/login" replace />;

    return (
        <div className="flex-1 w-full flex flex-col p-4 py-12">
            <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center mx-auto">

                {/* Register Form */}
                <GlassCard className="p-8 md:p-12 rounded-3xl w-full max-w-md mx-auto md:mx-0 relative z-10 animate-fade-in-up">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                    <Link to="/" className="inline-flex items-center gap-2 mb-8 hover:opacity-80 transition-opacity">
                        <div className="p-2 rounded-xl bg-primary/10 shadow-glow">
                            <BrandLogo />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Ephemera</span>
                    </Link>

                    <div className="mb-8 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2 tracking-tight">Tham gia Ephemera</h1>
                        <p className="text-text-secondary">Tạo inbox an toàn, ẩn danh trong vài giây.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <RegisterFormInputs
                            register={register}
                            errors={errors}
                            busy={busy}
                            passwordValue={passwordValue}
                            onPasswordChange={setPasswordValue}
                            strength={strength}
                        />
                        <TermsCheckbox />
                        <SubmitButton busy={busy} />
                    </form>

                    <TelegramHint />
                    <LoginLink />
                </GlassCard>

                <HeroSection />
                <SecurityBadge />
            </div>
        </div>
    );
}
