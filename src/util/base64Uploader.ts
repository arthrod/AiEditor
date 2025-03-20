import { Uploader } from "../core/AiEditor";

export const base64Uploader : Uploader = (file: File, _uploadUrl: string, _headers: Record<string, any>, _formName: string): Promise<Record<string, any>> => {
    let reader = new FileReader;
    return new Promise((accept, fail) => {
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                // Ensure we return an object with a url property
                accept({ url: reader.result });
            } else {
                fail(new Error("Failed to read file as base64"));
            }
        };
        reader.onerror = () => fail(reader.error);
        reader.readAsDataURL(file);
    })
}