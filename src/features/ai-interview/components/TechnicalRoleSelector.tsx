import React, { useState } from "react";
import { ArrowLeft, Check, Sparkles, Search, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PREDEFINED_ROLES } from "../ai-interview.types";

type TechnicalRoleSelectorProps = {
  onBack: () => void;
  onSelectRole: (role: string) => void;
  isLoading?: boolean;
};

export const TechnicalRoleSelector: React.FC<TechnicalRoleSelectorProps> = ({
  onBack,
  onSelectRole,
  isLoading = false,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>(PREDEFINED_ROLES[0]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customRole, setCustomRole] = useState<string>("");

  const filteredRoles = PREDEFINED_ROLES.filter((role) =>
    role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStart = () => {
    const finalRole = customRole.trim() ? customRole.trim() : selectedRole;
    if (finalRole && !isLoading) {
      onSelectRole(finalRole);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <button
        onClick={onBack}
        disabled={isLoading}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to interview types
      </button>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Select Technical Role</h1>
        <p className="text-muted-foreground text-sm">
          Gemini will generate 4 open-ended, medium-to-hard technical questions tailored specifically for this role.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search roles or enter a custom target role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredRoles.map((role) => {
          const isSelected = selectedRole === role && !customRole;

          return (
            <Card
              key={role}
              onClick={() => {
                setSelectedRole(role);
                setCustomRole("");
              }}
              className={`flex items-center justify-between p-4 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "hover:border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`size-8 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Code className="size-4" />
                </div>
                <span className="font-medium text-sm">{role}</span>
              </div>
              {isSelected && <Check className="size-4 text-primary font-bold" />}
            </Card>
          );
        })}
      </div>

      {/* Custom role fallback */}
      <Card className="p-4 space-y-3 bg-muted/20">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Or Specify Custom Role
        </div>
        <Input
          type="text"
          placeholder="e.g. Cloud DevOps Engineer, Embedded Systems Developer..."
          value={customRole}
          onChange={(e) => {
            setCustomRole(e.target.value);
          }}
          className="bg-background"
        />
      </Card>

      {/* Selected summary & Start button */}
      <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Selected Role</div>
          <div className="text-base font-bold text-foreground">
            {customRole.trim() ? customRole.trim() : selectedRole}
          </div>
          <div className="text-xs text-primary font-medium mt-0.5">
            4 Technical Questions · Medium/Hard
          </div>
        </div>

        <Button
          onClick={handleStart}
          disabled={isLoading || (!selectedRole && !customRole.trim())}
          className="w-full sm:w-auto gap-2 font-semibold shadow-glow px-6"
        >
          {isLoading ? (
            <>
              <div className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              <span>Generating Questions...</span>
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              <span>Start Technical Interview</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
