export interface StoryboardScene {
  sceneNumber: number;
  promptText: string;
  duration: number; // in seconds
  visualDirection: {
    cameraAngle: string;
    cameraMovement: string;
    lighting: string;
    props: string[];
    actions: string[];
    textOverlay?: string;
    backgroundSetting: string;
  };
  emotionalTone: string;
  transitionIn?: string;
  transitionOut?: string;
  notes?: string;
}

export interface Storyboard {
  id: string;
  script_id?: string;
  title: string;
  scenes: StoryboardScene[];
  total_duration: number;
  style_notes?: string;
  user_id?: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StoryboardGenerationParams {
  scriptContent: string;
  scriptTitle: string;
  duration: number;
  videoType: string;
  characterType: string;
  brandName?: string;
}
