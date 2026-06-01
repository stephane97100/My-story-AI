export type SectionType = 'introduction' | 'developpement' | 'climax' | 'conclusion';

export interface StorySection {
  id: SectionType;
  title: string; // Subsection title, e.g., "Le Commencement"
  text: string;
  imagePrompt: string;
  imageUrl: string | null;
  isGeneratingImage: boolean;
  imageError?: string;
}

export interface Story {
  id: string;
  title: string;
  genre: string;
  tone: string;
  audience: string;
  createdAt: string;
  userId?: string;
  isFavorite?: boolean;
  sections: Record<SectionType, StorySection>;
}

export interface StoryGenerationResponse {
  title: string;
  introduction: {
    title: string;
    text: string;
    imagePrompt: string;
  };
  developpement: {
    title: string;
    text: string;
    imagePrompt: string;
  };
  climax: {
    title: string;
    text: string;
    imagePrompt: string;
  };
  conclusion: {
    title: string;
    text: string;
    imagePrompt: string;
  };
}
