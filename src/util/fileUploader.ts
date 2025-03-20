import { Uploader } from "../core/AiEditor";

export const fileUploader: Uploader = (file: File, uploadUrl: string, headers: Record<string, any>, formName: string): Promise<Record<string, any>> => {
    const formData = new FormData();
    formData.append(formName, file);
    return new Promise((resolve, reject) => {
        fetch(uploadUrl, {
            method: "post",
            headers: {'Accept': 'application/json', ...headers},
            body: formData,
        }).then((resp) => resp.json())
            .then(json => {
                // Ensure the response has a url property
                if (typeof json === 'string') {
                    // If response is a string, assume it's a URL
                    resolve({ url: json });
                } else if (json && typeof json === 'object') {
                    // If response has a URL field or similar, use it
                    if (json.url) {
                        resolve(json);
                    } else if (json.data && json.data.url) {
                        resolve(json);
                    } else if (json.path) {
                        resolve({ url: json.path });
                    } else if (json.location) {
                        resolve({ url: json.location });
                    } else if (json.link) {
                        resolve({ url: json.link });
                    } else if (json.src) {
                        resolve({ url: json.src });
                    } else {
                        // If no recognizable URL field is found, convert to string
                        resolve({ url: JSON.stringify(json) });
                    }
                } else {
                    // If response is something else, convert to string
                    resolve({ url: String(json) });
                }
            }).catch((error) => {
                reject(error);
            });
    });
}