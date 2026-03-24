"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useQueries } from "@tanstack/react-query";

// Hooks
import { useGpaReport } from "@/hooks/use-gpa";
import { courseOptions } from "@/hooks/use-courses";

// Components
import PredictTitleRow from "@/components/predict/PredictTitleRow";
import PredictCard from "@/components/predict/PredictCard";
import WamOverviewCard from "@/components/predict/WamOverviewCard";
import TargetWamCard from "@/components/predict/TargetWamCard";
import RequiredScoresCard from "@/components/predict/RequiredScoresCard";
import SemesterProgressCard from "@/components/predict/SemesterProgressCard";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import SkeletonCard from "@/components/dashboard/SkeletonCard";

// Utils
import {
  computeWAM,
  computeRequired,
} from "@/lib/predict/wam-engine";
import type { CourseComputeData } from "@/lib/predict/wam-engine";
import { getLevelFromCode } from "@/lib/predict/faculty-weights";
import type { FacultyScheme } from "@/lib/predict/faculty-weights";
import { getCourseColor } from "@/lib/dashboard/course-colors";
import type { components } from "@/lib/api/types.gen";

type AssessmentWeight = components["schemas"]["AssessmentWeight"];

const VALID_SCHEMES: FacultyScheme[] = ["standard", "engineering", "science_honours"];
const LS_KEY = "uniboard-faculty-scheme";

/**
 * Read faculty scheme from localStorage with validation.
 */
function readFacultyScheme(): FacultyScheme {
  if (typeof window === "undefined") return "standard";
  const stored = localStorage.getItem(LS_KEY);
  if (stored && VALID_SCHEMES.includes(stored as FacultyScheme)) {
    return stored as FacultyScheme;
  }
  return "standard";
}

/**
 * PredictPage orchestrator.
 * Manages page-level state (predictions, faculty scheme, target WAM),
 * wires all components together, and injects right panel content via portal-slot.
 */
export default function PredictPage() {
  const t = useTranslations("predict");
  const searchParams = useSearchParams();

  // ── Data fetching ──────────────────────────────────────────────
  const gpaReport = useGpaReport();
  const courses = gpaReport.data?.data.courses ?? [];

  // Fetch course details for all courses (assessment_weights)
  const courseDetailQueries = useQueries({
    queries: courses.map((c) => courseOptions.detail(c.course_id)),
  });

  const isLoading =
    gpaReport.isLoading ||
    courseDetailQueries.some((q) => q.isLoading);

  // Build assessments map: courseId -> AssessmentWeight[]
  const assessmentsMap = useMemo<Record<string, AssessmentWeight[]>>(() => {
    const map: Record<string, AssessmentWeight[]> = {};
    courses.forEach((c, i) => {
      const detail = courseDetailQueries[i]?.data;
      if (detail) {
        map[c.course_id] = detail.data.assessment_weights;
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, ...courseDetailQueries.map((q) => q.data)]);

  // ── State ──────────────────────────────────────────────────────
  const [allPredictions, setAllPredictions] = useState<
    Record<string, Record<number, number | null>>
  >({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [facultyScheme, setFacultyScheme] = useState<FacultyScheme>(readFacultyScheme);
  const [targetWam, setTargetWam] = useState<number>(
    gpaReport.data?.data.target_wam ?? 85
  );

  // Update target when gpa data arrives
  useEffect(() => {
    if (gpaReport.data?.data.target_wam != null) {
      setTargetWam(gpaReport.data.data.target_wam);
    }
  }, [gpaReport.data]);

  // ── Faculty scheme persistence ─────────────────────────────────
  const handleFacultyChange = useCallback((scheme: FacultyScheme) => {
    setFacultyScheme(scheme);
    localStorage.setItem(LS_KEY, scheme);
  }, []);

  // ── Prediction change handler ──────────────────────────────────
  const handlePredictionChange = useCallback(
    (courseId: string, index: number, value: string) => {
      if (value === "") {
        setAllPredictions((prev) => ({
          ...prev,
          [courseId]: { ...prev[courseId], [index]: null },
        }));
        return;
      }
      const num = Number(value);
      if (isNaN(num)) return;
      const clamped = Math.min(100, Math.max(0, num));
      setAllPredictions((prev) => ({
        ...prev,
        [courseId]: { ...prev[courseId], [index]: clamped },
      }));
    },
    []
  );

  // ── Card expand/collapse ───────────────────────────────────────
  const toggleCard = useCallback((courseId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }, []);

  // ── Global WAM/Required computation ────────────────────────────
  const courseComputeData = useMemo<CourseComputeData[]>(() => {
    return courses.map((c) => {
      const awList = assessmentsMap[c.course_id] ?? [];
      return {
        courseId: c.course_id,
        code: c.code,
        creditPoints: c.credit_points,
        level: getLevelFromCode(c.code),
        assessments: awList.map((a) => ({
          weight: a.weight,
          score: a.score,
          maxScore: a.max_score,
        })),
        predictions: allPredictions[c.course_id] ?? {},
      };
    });
  }, [courses, assessmentsMap, allPredictions]);

  const wamResult = useMemo(
    () => computeWAM(courseComputeData, facultyScheme),
    [courseComputeData, facultyScheme]
  );

  const requiredResults = useMemo(
    () => computeRequired(courseComputeData, targetWam, facultyScheme),
    [courseComputeData, targetWam, facultyScheme]
  );

  // ── Course colors map ──────────────────────────────────────────
  const courseColorsMap = useMemo(() => {
    const map: Record<string, { base: string; soft: string }> = {};
    for (const c of courses) {
      map[c.code] = getCourseColor(c.code);
    }
    return map;
  }, [courses]);

  // ── Semester progress data ─────────────────────────────────────
  const progressData = useMemo(() => {
    return courses.map((c) => ({
      code: c.code,
      completedWeight: c.completed_weight,
      creditPoints: c.credit_points,
      color: getCourseColor(c.code).base,
    }));
  }, [courses]);

  // ── Total credit points ────────────────────────────────────────
  const totalCp = useMemo(
    () => courses.reduce((sum, c) => sum + c.credit_points, 0),
    [courses]
  );

  // ── Deep-link auto-expand ──────────────────────────────────────
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const deepLinkHandled = useRef(false);

  useEffect(() => {
    if (deepLinkHandled.current || courses.length === 0) return;

    const courseParam = searchParams.get("course");
    if (!courseParam) return;

    const matched = courses.find((c) => c.code === courseParam);
    if (!matched) return;

    deepLinkHandled.current = true;
    setExpandedCards((prev) => new Set(prev).add(matched.course_id));

    // Scroll into view after transition completes
    const timer = setTimeout(() => {
      const el = cardRefs.current[matched.course_id];
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [courses, searchParams]);

  // ── Portal target for right panel ──────────────────────────────
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.getElementById("right-panel-slot"));
  }, []);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      <AnimatedEntry delay={1}>
        <PredictTitleRow
          facultyScheme={facultyScheme}
          onFacultyChange={handleFacultyChange}
          totalCp={totalCp}
        />
      </AnimatedEntry>

      {/* Course prediction cards */}
      {isLoading ? (
        <div className="flex flex-col gap-[14px]">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} variant="generic" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-0">
          {courses.map((course, index) => (
            <AnimatedEntry
              key={course.course_id}
              delay={Math.min(index + 2, 10) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}
            >
              <div
                ref={(el) => {
                  if (cardRefs.current) cardRefs.current[course.course_id] = el;
                }}
                className="mb-[14px]"
              >
                <PredictCard
                  course={course}
                  assessments={assessmentsMap[course.course_id] ?? []}
                  predictions={allPredictions[course.course_id] ?? {}}
                  onPredictionChange={(i, v) =>
                    handlePredictionChange(course.course_id, i, v)
                  }
                  isExpanded={expandedCards.has(course.course_id)}
                  onToggle={() => toggleCard(course.course_id)}
                  courseColor={getCourseColor(course.code)}
                />
              </div>
            </AnimatedEntry>
          ))}
        </div>
      )}

      {/* Right panel via portal */}
      {portalTarget &&
        createPortal(
          <>
            <AnimatedEntry delay={5}>
              <WamOverviewCard
                wam={wamResult.wam}
                allFilled={wamResult.allFilled}
              />
            </AnimatedEntry>
            <AnimatedEntry delay={6}>
              <TargetWamCard
                targetWam={targetWam}
                onTargetChange={setTargetWam}
                currentWam={wamResult.wam}
              />
            </AnimatedEntry>
            <AnimatedEntry delay={7}>
              <RequiredScoresCard
                results={requiredResults}
                courseColors={courseColorsMap}
              />
            </AnimatedEntry>
            <AnimatedEntry delay={8}>
              <SemesterProgressCard courses={progressData} />
            </AnimatedEntry>
          </>,
          portalTarget
        )}
    </>
  );
}
