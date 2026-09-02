export type OnlyOfficeCallbackPayload = {
  key?: string;
  status: number;
  url?: string;
  changesurl?: string;
  history?: unknown;
  users?: string[];
  actions?: Array<{ type: number; userid: string }>;
  lastsave?: string;
  notmodified?: boolean;
  token?: string;
};

export type OnlyOfficeEditorConfig = {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions?: {
      edit?: boolean;
      download?: boolean;
      print?: boolean;
    };
  };
  documentType: 'word' | 'cell' | 'slide';
  editorConfig: {
    callbackUrl: string;
    mode: 'edit';
    lang: string;
    customization?: {
      forcesave?: boolean;
      autosave?: boolean;
    };
    user: {
      id: string;
      name: string;
    };
  };
  token?: string;
};

export type OnlyOfficeFileTokenPayload = {
  documentId: string;
  type: 'file';
};

export type OnlyOfficeAssetTokenPayload = {
  storageKey: string;
  type: 'asset';
};
