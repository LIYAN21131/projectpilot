export type InterviewQuestionType = "common" | "deep";

export type StarAnswer = {
  situation: string;
  task: string;
  action: string;
  result: string;
  interviewAnswer?: string;
};

export type InterviewQuestion = {
  id: string;
  projectId: string;
  category: string;
  type: InterviewQuestionType;
  question: string;
  answerSuggestion: StarAnswer;
};

export type InterviewPreparation = {
  id: string;
  projectId: string;
  questions: InterviewQuestion[];
  createdAt: string;
};
