import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Target, Sparkles, Settings, TrendingUp, Building2, Heart, GraduationCap, Code, Cpu, Brain, Megaphone, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { invokeFunction } from "@/integrations/functions/client";
import { searchPastGoals, type PastGoalHit } from "@/integrations/rvf/goalRepo";
import { searchKeptTrajectoryGoals, type KeptGoalHit } from "@/integrations/agentdb/trajectory";
import { RVF_ENABLED } from "@/lib/featureFlags";
import { useToast } from "@/hooks/use-toast";

interface GoalInputProps {
  onSubmit: (goal: string) => void;
  isPlanning: boolean;
  onAdvancedSettings?: () => void;
  onConfigUpdate?: (config: any) => void;
  /**
   * One-shot hydration source for the goal textarea (e.g. from
   * RVF persistence in Index.tsx). Only adopted when the textarea
   * is empty — typing into the field "owns" it from then on so an
   * upstream prop change doesn't clobber in-progress edits.
   */
  initialValue?: string;
}

export const GoalInput = ({ onSubmit, isPlanning, onAdvancedSettings, onConfigUpdate, initialValue }: GoalInputProps) => {
  const [goal, setGoal] = useState(initialValue ?? "");
  // Adopt initialValue when it arrives (e.g. RVF hydrate-on-mount
  // resolves after the component mounted with empty defaults).
  // Only hydrate while the textarea is still empty so user typing
  // wins.
  useEffect(() => {
    if (initialValue && !goal) setGoal(initialValue);
    // Intentionally ignore `goal` in deps — we only want to react
    // to upstream initialValue changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);
  const [isGenerating, setIsGenerating] = useState(false);
  // R-2.4 + R-4.3: HNSW recall for autocomplete chips. Two tiers:
  //   1. KEPT trajectory goals (R-4.3) — high signal: goals from
  //      research runs the user marked as 'kept'. Surfaced first.
  //   2. Past goals (R-2.4) — broader: every saved goal ≥10 chars.
  //      Used as fallback when there are no kept-trajectory hits.
  // Debounced 300ms; only queries when RVF storage is enabled.
  type Suggestion = { id: string; text: string; score: number; kind: 'kept' | 'past' };
  const [goalSuggestions, setGoalSuggestions] = useState<Suggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!RVF_ENABLED) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const keptHits: KeptGoalHit[] = await searchKeptTrajectoryGoals(goal, 3);
        if (keptHits.length > 0) {
          setGoalSuggestions(keptHits.map((h) => ({ id: h.id, text: h.text, score: h.score, kind: 'kept' as const })));
          return;
        }
        // Fallback to broader past-goals recall.
        const pastHits: PastGoalHit[] = await searchPastGoals(goal, 3);
        setGoalSuggestions(pastHits.map((h) => ({ id: h.id, text: h.text, score: h.score, kind: 'past' as const })));
      } catch {
        setGoalSuggestions([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [goal]);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (goal.trim()) {
      onSubmit(goal.trim());
    }
  };

  const categoryToPresetMap: Record<string, string> = {
    'finance': 'market-trends',
    'business': 'startup-validation',
    'marketing': 'competitive-analysis',
    'medical': 'medical-clinical',
    'education': 'academic-deep',
    'coding': 'technical-feasibility',
    'technical': 'technical-feasibility',
    'ai-ml': 'technical-feasibility',
  };

  const categories = [
    { id: 'finance', label: 'Finance', icon: TrendingUp, color: '#10b981' },
    { id: 'business', label: 'Business', icon: Building2, color: '#3b82f6' },
    { id: 'marketing', label: 'Marketing', icon: Megaphone, color: '#f97316' },
    { id: 'medical', label: 'Medical', icon: Heart, color: '#ef4444' },
    { id: 'education', label: 'Education', icon: GraduationCap, color: '#f59e0b' },
    { id: 'coding', label: 'Coding', icon: Code, color: '#8b5cf6' },
    { id: 'technical', label: 'Technical', icon: Cpu, color: '#06b6d4' },
    { id: 'ai-ml', label: 'AI & ML', icon: Brain, color: '#ec4899' },
  ];

  const generateGoals = async (category: string) => {
    setIsGenerating(true);
    try {
      // Generate goal and optimize config in parallel
      const [goalResult, configResult] = await Promise.all([
        invokeFunction<{ goals?: string[] }>('generate-research-goal', { category }),
        invokeFunction<{ config?: unknown }>('optimize-research-config', {
          preset: categoryToPresetMap[category] || 'academic-deep',
          currentGoal: '',
        }),
      ]);

      if (goalResult.error) throw new Error(goalResult.error.message);

      if (goalResult.data?.goals && goalResult.data.goals.length > 0) {
        // Set the first generated goal
        setGoal(goalResult.data.goals[0]);
        
        // Update config if available and callback provided
        if (configResult.data?.config && onConfigUpdate) {
          onConfigUpdate(configResult.data.config);
        }
        
        toast({
          title: "Goal & Settings Optimized",
          description: `Generated research goal and optimized settings for ${category}`,
        });
      }
    } catch (error) {
      console.error('Error generating goals:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate research goals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Define Research Objective</h2>
        </div>
        {onAdvancedSettings && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAdvancedSettings}
            disabled={isPlanning}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Advanced</span>
          </Button>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Enter your research goal or objective..."
            className="min-h-[80px] sm:min-h-[100px] resize-none bg-background border-border text-foreground text-sm"
            disabled={isPlanning}
          />
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
            The GOAP system will analyze your objective and plan the optimal research workflow
          </p>
          {goalSuggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5" data-testid="past-goal-suggestions">
              <History className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] sm:text-xs text-muted-foreground mr-1">
                {goalSuggestions[0].kind === 'kept' ? 'Kept past goals:' : 'Similar past goals:'}
              </span>
              {goalSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setGoal(s.text)}
                  className={cn(
                    'text-[10px] sm:text-xs px-2 py-0.5 rounded-full transition-colors',
                    s.kind === 'kept'
                      ? 'bg-primary/10 hover:bg-primary/20 text-primary'
                      : 'bg-muted hover:bg-accent text-foreground/80 hover:text-foreground',
                  )}
                  title={`cosine ${s.score.toFixed(3)} · ${s.kind === 'kept' ? 'kept trajectory' : 'past goal'}`}
                  data-suggestion-kind={s.kind}
                >
                  {s.text.length > 60 ? s.text.slice(0, 57) + '…' : s.text}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-foreground">AI-Generate by Category:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => generateGoals(cat.id)}
                disabled={isPlanning || isGenerating}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all text-xs",
                  "border border-border hover:border-primary/50",
                  "bg-card hover:bg-muted",
                  (isPlanning || isGenerating) && "opacity-50 cursor-not-allowed"
                )}
                style={{
                  borderColor: isGenerating ? cat.color : undefined,
                }}
              >
                <cat.icon className="w-3 h-3" style={{ color: cat.color }} />
                <span className="text-foreground">{cat.label}</span>
              </button>
            ))}
          </div>
          {isGenerating && (
            <p className="text-xs text-primary flex items-center gap-1.5 mt-2">
              <Sparkles className="w-3 h-3 animate-spin" />
              Generating research goals...
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!goal.trim() || isPlanning}
          className="w-full text-sm"
        >
          {isPlanning ? (
            <>
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
              <span className="text-xs sm:text-sm">Planning Research Workflow...</span>
            </>
          ) : (
            <>
              <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              <span className="text-xs sm:text-sm">Generate Research Plan</span>
            </>
          )}
        </Button>
        {!goal.trim() && !isPlanning && (
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center -mt-2">
            Type a goal above or pick a category to begin
          </p>
        )}
      </form>
    </div>
  );
};
