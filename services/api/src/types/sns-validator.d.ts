declare module "sns-validator" {
  class MessageValidator {
    validate(
      message: unknown,
      callback: (err: Error | null) => void
    ): void;
  }
  export = MessageValidator;
}
