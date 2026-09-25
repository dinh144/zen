export interface paths {
    "/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Sign in with the local password */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["LoginInput"];
                };
            };
            responses: {
                /** @description Signed in; the session cookie is set. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Ok"];
                    };
                };
                /** @description Wrong password. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List or search cards */
        get: {
            parameters: {
                query?: {
                    q?: string;
                    limit?: number;
                    after?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CardsList"];
                    };
                };
            };
        };
        put?: never;
        /** Capture a new card */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CardInput"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CardResponse"];
                    };
                };
                /** @description Invalid card */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Daily cap reached */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cards/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read one card, with what links to it and from it */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CardDetail"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /** Soft-delete a card */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Ok"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /** Edit, tag, pin, link, restore or resurface a card */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CardPatch"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CardResponse"];
                    };
                };
                /** @description Invalid patch */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/cards/{id}/vibe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Same Vibe: a moodboard built from one image card */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Vibe"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/spaces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List this mind's spaces */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SpacesList"];
                    };
                };
            };
        };
        put?: never;
        /** Create a space (or a Smart Space, given a query) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["SpaceInput"];
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SpaceCreated"];
                    };
                };
                /** @description Name required */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/spaces/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** A space's cards */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SpaceCards"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /** Delete a space */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Ok"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /** Add or remove a card, or share/unshare the space */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["SpacePatch"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SpacePatchResult"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/ask": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Ask the drop a question, answered from this mind's cards */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["AskInput"];
                };
            };
            responses: {
                /** @description An answer, a grilled question, a running task's result, or none. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AskReply"];
                    };
                };
                /** @description No question */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ask/answer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Answer one open question the agent grilled */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["AskAnswerInput"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Ok"];
                    };
                };
                /** @description Invalid */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/log/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Undo one logged agent or drop action */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Ok"];
                    };
                };
                /** @description Nothing to undo */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Change this mind's locale */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["SettingsPatch"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Ok"];
                    };
                };
                /** @description Bad locale */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/reenrich": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Re-queue tagging and embeddings */
        post: {
            parameters: {
                query?: {
                    all?: "0" | "1";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ReenrichResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Every card, space, membership and link this mind owns */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Export"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Import a zen export, a card array, bookmark HTML or a CSV */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["ImportInput"];
                    "text/html": string;
                    "text/csv": string;
                };
            };
            responses: {
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ImportResponse"];
                    };
                };
                /** @description Invalid import */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Daily cap reached */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/upload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload a file as a card: multipart directly, or the cloud's ticket-then-PUT flow (JSON) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "multipart/form-data": {
                        file: string;
                        title?: string;
                        url?: string;
                        note?: string;
                    };
                    "application/json": components["schemas"]["UploadTicketInput"] | components["schemas"]["UploadDoneInput"];
                };
            };
            responses: {
                /** @description An upload ticket (cloud only) */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["UploadTicketResponse"];
                    };
                };
                /** @description Created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CardResponse"];
                    };
                };
                /** @description Invalid */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Not yours */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Too large */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Daily cap reached */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/file/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * A stored upload's bytes (redirects to storage in the cloud)
         * @description No auth: the file name is an unguessable capability (a random id), the same model a signed URL uses. Anyone holding the name can read the file, and no one can guess a name they were not given.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    name: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The file's bytes. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/mcp": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Model Context Protocol server (JSON-RPC 2.0) — zen as memory for other AI assistants */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["McpRequest"];
                };
            };
            responses: {
                /** @description A JSON-RPC 2.0 result or error. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["McpResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        LoginInput: {
            password: string;
        };
        /** @description A new card: give a url, a note, a quote, or any mix. */
        CardInput: {
            url?: string | null;
            note?: string | null;
            title?: string | null;
            /** @enum {string} */
            kind?: "note" | "quote" | "link" | "article" | "image" | "video" | "product" | "book" | "movie" | "recipe" | "tweet" | "person" | "color" | "font" | "pdf" | "file";
            quote?: string;
            content?: string | null;
        };
        CardPatch: {
            /** @enum {string} */
            kind?: "note" | "quote" | "link" | "article" | "image" | "video" | "product" | "book" | "movie" | "recipe" | "tweet" | "person" | "color" | "font" | "pdf" | "file";
            title?: string | null;
            note?: string | null;
            colors?: string[];
            tags?: string[];
            pinned?: boolean;
            seen?: boolean;
            /** Format: uuid */
            link?: string;
            /** Format: uuid */
            unlink?: string;
            restore?: boolean;
            resurface?: string | null;
        };
        /** @description parent must be one of this mind's own space ids, or it is dropped. */
        SpaceInput: {
            name: string;
            query?: string | null;
            /** Format: uuid */
            parent?: string;
        };
        SpacePatch: {
            /** Format: uuid */
            add?: string;
            /** Format: uuid */
            remove?: string;
            shared?: boolean;
        };
        /** @description Truncated server-side to 500 characters. */
        AskInput: {
            question: string;
        };
        /** @description Answers an open question the agent grilled; answer is truncated server-side to 300 characters. */
        AskAnswerInput: {
            id: string;
            answer: string;
        };
        /** @description One of the app's locale codes (vi, en, ko, zh, ja). */
        SettingsPatch: {
            locale: string;
        };
        ImportInput: {
            cards?: {
                [key: string]: unknown;
            }[];
            spaces?: {
                id: string;
                name: string;
                query?: string | null;
            }[];
            members?: {
                card_id: string;
                space_id: string;
            }[];
            links?: {
                from_id: string;
                to_id: string;
            }[];
        };
        UploadTicketInput: {
            /** @constant */
            intent: "ticket";
            name?: string;
            size: number;
        };
        UploadDoneInput: {
            intent?: string;
            file: string;
            name?: string;
            type?: string;
        };
        /** @description method: initialize | ping | tools/list | tools/call. For tools/call, params = {name, arguments}; arguments per tool: search_memory -> McpSearchArgs, get_card -> McpGetCardArgs, save_card -> McpSaveCardArgs, ask_zen -> McpAskArgs. */
        McpRequest: {
            /** @constant */
            jsonrpc: "2.0";
            id?: string | number | null;
            method: string;
            params?: unknown;
        };
        Ok: {
            /** @constant */
            ok: true;
        };
        Error: {
            error: string;
        };
        CardsList: {
            cards: components["schemas"]["Card"][];
        };
        /** @description A saved card: a note, link, image or other kind of memory. */
        Card: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            kind: "note" | "quote" | "link" | "article" | "image" | "video" | "product" | "book" | "movie" | "recipe" | "tweet" | "person" | "color" | "font" | "pdf" | "file";
            title: string | null;
            url: string | null;
            domain: string | null;
            note: string | null;
            content: string | null;
            image_path: string | null;
            meta: {
                [key: string]: unknown;
            };
            colors: string[];
            tags: string[];
            space_ids?: string[];
            has_article: boolean;
            pinned_at: string | null;
            seen_at: string | null;
            enriched_at: string | null;
            created_at: string;
            updated_at: string;
        };
        CardResponse: {
            card: components["schemas"]["Card"];
        };
        CardDetail: {
            card: components["schemas"]["Card"];
            related: components["schemas"]["Card"][];
            links: components["schemas"]["Card"][];
            resurface: string | null;
        };
        Vibe: {
            cards: components["schemas"]["Card"][];
        };
        SpacesList: {
            spaces: components["schemas"]["Space"][];
        };
        /** @description A named, or query-based smart, group of cards. */
        Space: {
            /** Format: uuid */
            id: string;
            name: string;
            query: string | null;
            share_token: string | null;
            created_at: string;
            parent_id?: string | null;
            card_count?: number;
            cover?: string[];
        };
        SpaceCreated: {
            space: components["schemas"]["Space"];
        };
        SpaceCards: {
            cards: components["schemas"]["Card"][];
        };
        SpacePatchResult: {
            /** @constant */
            ok: true;
        } | {
            space: components["schemas"]["Space"];
        };
        AskReply: {
            /** @constant */
            kind: "answer";
            text: string;
            cards: string[];
            edges: {
                source: string;
                predicate: string;
                target: string;
                card_id: string | null;
            }[];
            findings?: {
                title: string;
                url: string;
                why: string;
            }[];
            done?: string[];
        } | {
            /** @constant */
            kind: "grill";
            text: string;
            questions: {
                id: string;
                question: string;
                options: {
                    label: string;
                    detail: string;
                }[];
            }[];
        } | {
            /** @constant */
            kind: "none";
            text: string;
        } | {
            /** @constant */
            kind: "task";
            text: string;
            /** @constant */
            task: "organize";
            topic: string;
            done: {
                machine: number;
                pinned: number;
                loose: number;
            };
        } | {
            /** @constant */
            kind: "task";
            text: string;
            /** @constant */
            task: "web";
            topic: string;
            findings: {
                title: string;
                url: string;
                why: string;
            }[];
        } | {
            /** @constant */
            kind: "task";
            text: string;
            /** @constant */
            task: "lint";
            topic: string;
            lint: {
                duplicates: {
                    keep: string;
                    drop: string;
                    similarity: number;
                }[];
                orphans: string[];
            };
        };
        ReenrichResponse: {
            queued: number;
        };
        /** @description Every card (embeddings left out), space, membership and link this mind owns. */
        Export: {
            exported_at: string;
            cards: {
                [key: string]: unknown;
            }[];
            spaces: {
                [key: string]: unknown;
            }[];
            members: {
                [key: string]: unknown;
            }[];
            links: {
                [key: string]: unknown;
            }[];
        };
        ImportResponse: {
            imported: number;
        };
        UploadTicketResponse: {
            name: string;
            url: string;
        };
        /** @description A JSON-RPC 2.0 result or error envelope. */
        McpResponse: {
            /** @constant */
            jsonrpc: "2.0";
            id: string | number | null;
        } & {
            [key: string]: unknown;
        };
        McpSearchArgs: {
            query: string;
        };
        McpGetCardArgs: {
            id: string;
        };
        /** @description note or url is required (checked at runtime, not expressible in this shape). */
        McpSaveCardArgs: {
            note?: string;
            url?: string;
            title?: string;
        };
        McpAskArgs: {
            question: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
