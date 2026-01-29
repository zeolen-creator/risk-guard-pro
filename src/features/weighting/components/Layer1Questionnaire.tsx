import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Building2, Users, Shield, MapPin, FileText, Heart, AlertTriangle, Target } from "lucide-react";
import type { QuestionnaireResponse } from "../types";

interface Layer1QuestionnaireProps {
  initialData?: Partial<QuestionnaireResponse>;
  onChange: (data: QuestionnaireResponse) => void;
}

const INCIDENT_OPTIONS = [
  "Natural disasters (flood, fire, earthquake)",
  "Cyberattacks or data breaches",
  "Workplace injuries",
  "Environmental incidents",
  "Reputational crises",
  "Financial losses from operational failures",
  "Supply chain disruptions",
  "None of the above",
];

export function Layer1Questionnaire({ initialData, onChange }: Layer1QuestionnaireProps) {
  const [formData, setFormData] = useState<QuestionnaireResponse>({
    org_size: initialData?.org_size || "medium",
    public_facing: initialData?.public_facing ?? true,
    critical_infrastructure: initialData?.critical_infrastructure ?? false,
    regulatory_environment: initialData?.regulatory_environment || "moderate",
    geographic_risk: initialData?.geographic_risk || "moderate",
    stakeholder_priority: initialData?.stakeholder_priority || "",
    previous_incidents: initialData?.previous_incidents || [],
    mission_statement: initialData?.mission_statement || "",
    vision_statement: initialData?.vision_statement || "",
    core_values: initialData?.core_values || [],
  });

  const [coreValuesText, setCoreValuesText] = useState(formData.core_values?.join(", ") || "");

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const updateField = <K extends keyof QuestionnaireResponse>(
    field: K,
    value: QuestionnaireResponse[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleIncident = (incident: string) => {
    setFormData((prev) => {
      const current = prev.previous_incidents || [];
      if (incident === "None of the above") {
        return { ...prev, previous_incidents: current.includes(incident) ? [] : [incident] };
      }
      const filtered = current.filter((i) => i !== "None of the above");
      if (filtered.includes(incident)) {
        return { ...prev, previous_incidents: filtered.filter((i) => i !== incident) };
      }
      return { ...prev, previous_incidents: [...filtered, incident] };
    });
  };

  const handleCoreValuesChange = (text: string) => {
    setCoreValuesText(text);
    const values = text.split(",").map((v) => v.trim()).filter(Boolean);
    updateField("core_values", values);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Organization Context</h1>
        <p className="text-muted-foreground">
          Help us understand your organization to provide tailored weight recommendations.
        </p>
      </div>

      {/* Question 1: Organization Size */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Organization Size
          </CardTitle>
          <CardDescription>How many employees does your organization have?</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.org_size}
            onValueChange={(v) => updateField("org_size", v as QuestionnaireResponse["org_size"])}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { value: "small", label: "Small", desc: "1-50 employees" },
              { value: "medium", label: "Medium", desc: "51-500 employees" },
              { value: "large", label: "Large", desc: "501-5,000 employees" },
              { value: "enterprise", label: "Enterprise", desc: "5,000+ employees" },
            ].map((option) => (
              <Label
                key={option.value}
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${formData.org_size === option.value ? 'border-primary bg-primary/5' : ''}`}
              >
                <RadioGroupItem value={option.value} className="sr-only" />
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.desc}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Question 2: Public Facing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Public-Facing Operations
          </CardTitle>
          <CardDescription>
            Does your organization directly serve the public (customers, patients, students, etc.)?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.public_facing ? "yes" : "no"}
            onValueChange={(v) => updateField("public_facing", v === "yes")}
            className="flex gap-4"
          >
            <Label className={`flex items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${formData.public_facing ? 'border-primary bg-primary/5' : ''}`}>
              <RadioGroupItem value="yes" />
              <span>Yes, we serve the public directly</span>
            </Label>
            <Label className={`flex items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${!formData.public_facing ? 'border-primary bg-primary/5' : ''}`}>
              <RadioGroupItem value="no" />
              <span>No, primarily B2B or internal</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Question 3: Critical Infrastructure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Critical Infrastructure
          </CardTitle>
          <CardDescription>
            Is your organization part of critical infrastructure (utilities, healthcare, transportation, etc.)?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.critical_infrastructure ? "yes" : "no"}
            onValueChange={(v) => updateField("critical_infrastructure", v === "yes")}
            className="flex gap-4"
          >
            <Label className={`flex items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${formData.critical_infrastructure ? 'border-primary bg-primary/5' : ''}`}>
              <RadioGroupItem value="yes" />
              <span>Yes, critical infrastructure</span>
            </Label>
            <Label className={`flex items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${!formData.critical_infrastructure ? 'border-primary bg-primary/5' : ''}`}>
              <RadioGroupItem value="no" />
              <span>No, not critical infrastructure</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Question 4: Regulatory Environment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Regulatory Environment
          </CardTitle>
          <CardDescription>
            How heavily regulated is your industry?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.regulatory_environment}
            onValueChange={(v) => updateField("regulatory_environment", v as QuestionnaireResponse["regulatory_environment"])}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { value: "low", label: "Low", desc: "Minimal oversight" },
              { value: "moderate", label: "Moderate", desc: "Standard compliance" },
              { value: "high", label: "High", desc: "Significant oversight" },
              { value: "very_high", label: "Very High", desc: "Heavily regulated" },
            ].map((option) => (
              <Label
                key={option.value}
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${formData.regulatory_environment === option.value ? 'border-primary bg-primary/5' : ''}`}
              >
                <RadioGroupItem value={option.value} className="sr-only" />
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.desc}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Question 5: Geographic Risk */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Geographic Risk Exposure
          </CardTitle>
          <CardDescription>
            What is your location's exposure to natural hazards?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.geographic_risk}
            onValueChange={(v) => updateField("geographic_risk", v as QuestionnaireResponse["geographic_risk"])}
            className="grid grid-cols-3 gap-4"
          >
            {[
              { value: "low", label: "Low", desc: "Few natural hazards" },
              { value: "moderate", label: "Moderate", desc: "Some seasonal risks" },
              { value: "high", label: "High", desc: "Frequent natural events" },
            ].map((option) => (
              <Label
                key={option.value}
                className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${formData.geographic_risk === option.value ? 'border-primary bg-primary/5' : ''}`}
              >
                <RadioGroupItem value={option.value} className="sr-only" />
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.desc}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Question 6: Stakeholder Priority */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Primary Stakeholder Priority
          </CardTitle>
          <CardDescription>
            Who does your organization prioritize protecting most?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g., Employees, Patients, Students, Customers, Community"
            value={formData.stakeholder_priority}
            onChange={(e) => updateField("stakeholder_priority", e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Question 7: Previous Incidents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Previous Incidents
          </CardTitle>
          <CardDescription>
            Has your organization experienced any of the following in the past 5 years?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INCIDENT_OPTIONS.map((incident) => (
              <Label
                key={incident}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={formData.previous_incidents?.includes(incident)}
                  onCheckedChange={() => toggleIncident(incident)}
                />
                <span className="text-sm">{incident}</span>
              </Label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Question 8: Mission & Values */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Mission, Vision & Values
          </CardTitle>
          <CardDescription>
            Optional: Provide your organization's statements for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Mission Statement</Label>
            <Textarea
              placeholder="What is your organization's mission?"
              value={formData.mission_statement}
              onChange={(e) => updateField("mission_statement", e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Vision Statement</Label>
            <Textarea
              placeholder="What is your organization's vision for the future?"
              value={formData.vision_statement}
              onChange={(e) => updateField("vision_statement", e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Core Values</Label>
            <Input
              placeholder="Enter values separated by commas (e.g., Safety, Integrity, Excellence)"
              value={coreValuesText}
              onChange={(e) => handleCoreValuesChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
