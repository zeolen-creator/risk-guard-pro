import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useCreateOrganization, useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Building2, User, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { SECTOR_OPTIONS, REGION_OPTIONS, SIZE_OPTIONS } from "@/constants/hazards";

const orgSchema = z.object({
  name: z.string().min(2, "Organization name is required"),
  sector: z.string().min(1, "Please select a sector"),
  region: z.string().min(1, "Please select a region"),
  size: z.string().optional(),
  description: z.string().optional(),
});

const profileSchema = z.object({
  role_title: z.string().min(2, "Please enter your role/title"),
  department: z.string().optional(),
  expertise: z.string().optional(),
});

type OrgFormData = z.infer<typeof orgSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: organization } = useOrganization();
  const createOrg = useCreateOrganization();
  const updateProfile = useUpdateProfile();

  const orgForm = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      sector: "",
      region: "",
      size: "",
      description: "",
    },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      role_title: profile?.role_title || "",
      department: profile?.department || "",
      expertise: profile?.expertise || "",
    },
  });

  // Redirect if already onboarded
  if (!profileLoading && profile?.org_id && organization) {
    navigate("/dashboard");
    return null;
  }

  const onOrgSubmit = async (data: OrgFormData) => {
    try {
      await createOrg.mutateAsync({
        name: data.name,
        sector: data.sector,
        region: data.region,
        size: data.size || null,
        description: data.description || null,
        weights_configured: false,
        primary_location: null,
        key_facilities: null,
      });
      setStep(2);
    } catch (error) {
      console.error("Error creating organization:", error);
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Welcome to HIRA Pro</h1>
          <p className="text-muted-foreground">Let's get you set up</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? "text-accent" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
              {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : <Building2 className="h-4 w-4" />}
            </div>
            <span className="text-sm font-medium hidden sm:inline">Organization</span>
          </div>
          <div className="w-8 h-0.5 bg-muted" />
          <div className={`flex items-center gap-2 ${step >= 2 ? "text-accent" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">Your Profile</span>
          </div>
        </div>

        {step === 1 && (
          <Card className="shadow-xl border-0 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                Create Your Organization
              </CardTitle>
              <CardDescription>
                Set up your organization to start conducting risk assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={orgForm.handleSubmit(onOrgSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    placeholder="Acme Corporation"
                    {...orgForm.register("name")}
                  />
                  {orgForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{orgForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sector *</Label>
                    <Select onValueChange={(v) => orgForm.setValue("sector", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTOR_OPTIONS.map((sector) => (
                          <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {orgForm.formState.errors.sector && (
                      <p className="text-sm text-destructive">{orgForm.formState.errors.sector.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Region *</Label>
                    <Select onValueChange={(v) => orgForm.setValue("region", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGION_OPTIONS.map((region) => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {orgForm.formState.errors.region && (
                      <p className="text-sm text-destructive">{orgForm.formState.errors.region.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Organization Size</Label>
                  <Select onValueChange={(v) => orgForm.setValue("size", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your organization's activities..."
                    rows={3}
                    {...orgForm.register("description")}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={createOrg.isPending}
                >
                  {createOrg.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="shadow-xl border-0 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                Your Profile
              </CardTitle>
              <CardDescription>
                Tell us about your role and expertise to personalize hazard recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role_title">Your Role/Title *</Label>
                  <Input
                    id="role_title"
                    placeholder="e.g., Safety Manager, Risk Analyst"
                    {...profileForm.register("role_title")}
                  />
                  {profileForm.formState.errors.role_title && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.role_title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g., Operations, EHS, Risk Management"
                    {...profileForm.register("department")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expertise">Areas of Expertise</Label>
                  <Textarea
                    id="expertise"
                    placeholder="Describe your expertise areas, certifications, or focus areas..."
                    rows={3}
                    {...profileForm.register("expertise")}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={updateProfile.isPending}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    size="lg"
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Complete Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
