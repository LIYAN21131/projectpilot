"use client";

import { useEffect, useMemo, useState } from "react";
import type { InterviewPreparation, InterviewQuestion } from "@/types/interview";
import type { Project, ProjectAsset } from "@/types/project";
import type { ResumeOptimizationResult } from "@/types/resume";
import type { UserProfile } from "@/types/user";
import { defaultUserProfile } from "@/lib/mock/projects";

const PROJECTS_KEY = "projectpilot.projects";
const ASSETS_KEY = "projectpilot.assets";
const RESUME_KEY = "projectpilot.resumeResults";
const INTERVIEW_KEY = "projectpilot.interviewQuestions";
const INTERVIEW_PREP_KEY = "projectpilot.interviewPreparations";
const PROFILE_KEY = "projectpilot.profile";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function useProjectPilotStore() {
  const [hydrated, setHydrated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [resumeResults, setResumeResults] = useState<ResumeOptimizationResult[]>([]);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [interviewPreparations, setInterviewPreparations] = useState<InterviewPreparation[]>([]);
  const [profile, setProfile] = useState<UserProfile>(defaultUserProfile);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProjects(read<Project[]>(PROJECTS_KEY, []));
      setAssets(read<ProjectAsset[]>(ASSETS_KEY, []));
      setResumeResults(read<ResumeOptimizationResult[]>(RESUME_KEY, []));
      setInterviewQuestions(read<InterviewQuestion[]>(INTERVIEW_KEY, []));
      setInterviewPreparations(read<InterviewPreparation[]>(INTERVIEW_PREP_KEY, []));
      setProfile(read<UserProfile>(PROFILE_KEY, defaultUserProfile));
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    write(PROJECTS_KEY, projects);
    write(ASSETS_KEY, assets);
    write(RESUME_KEY, resumeResults);
    write(INTERVIEW_KEY, interviewQuestions);
    write(INTERVIEW_PREP_KEY, interviewPreparations);
    write(PROFILE_KEY, {
      ...profile,
      projectCount: projects.length,
      resumeOptimizationCount: resumeResults.length,
      interviewPrepCount: interviewPreparations.length,
    });
  }, [hydrated, projects, assets, resumeResults, interviewQuestions, interviewPreparations, profile]);

  const stats = useMemo(
    () => ({
      projectCount: projects.length,
      resumeOptimizationCount: resumeResults.length,
      interviewPrepCount: interviewPreparations.length,
    }),
    [projects.length, resumeResults.length, interviewPreparations.length],
  );

  return {
    hydrated,
    projects,
    setProjects,
    assets,
    setAssets,
    resumeResults,
    setResumeResults,
    interviewQuestions,
    setInterviewQuestions,
    interviewPreparations,
    setInterviewPreparations,
    profile: { ...profile, ...stats },
    setProfile,
    stats,
  };
}
