export interface HelpSection {
  heading?: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  note?: string;
  copyBlock?: {
    label: string;
    buttonLabel?: string;
    text: string;
  };
}

export interface HelpTopic {
  key: string;
  title: string;
  summary?: string;
  sections: readonly HelpSection[];
}
