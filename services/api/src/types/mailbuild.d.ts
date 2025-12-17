declare module 'mailbuild' {
    export default class Mailbuild {
        constructor(contentType?: string);
        setHeader(key: string, value: string): this;
        setContent(content: string): this;
        appendChild(): Mailbuild;
        build(): string;
    }
}
