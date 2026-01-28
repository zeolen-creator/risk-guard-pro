import { useState, useEffect } from "react";
import { useOrganization, useUpdateOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Radio, 
  Building2, 
  Tag, 
  Save, 
  Loader2, 
  AlertTriangle,
  X,
  Plus,
} from "lucide-react";
import { 
  CANADIAN_PROVINCES, 
  INDUSTRY_TYPES, 
  ALERT_CATEGORIES,
  DEFAULT_NEWS_SETTINGS,
  type NewsSettings,
} from "@/constants/canadianProvinces";

export function RegionalRiskSettings() {
  const { data: organization, isLoading } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const { toast } = useToast();

  // Local state for form
  const [enabled, setEnabled] = useState(false);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [radiusKm, setRadiusKm] = useState(100);
  const [industryType, setIndustryType] = useState("");
  const [categories, setCategories] = useState<Record<string, boolean>>(DEFAULT_NEWS_SETTINGS.categories);
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");

  // Initialize form from organization data
  useEffect(() => {
    if (organization) {
      const newsSettings = organization.news_settings;
      const primaryLocation = organization.primary_location;
      
      if (newsSettings) {
        setEnabled(newsSettings.enabled ?? false);
        setRadiusKm(newsSettings.monitoring_radius_km ?? 100);
        setCategories(newsSettings.categories ?? DEFAULT_NEWS_SETTINGS.categories);
        setCustomKeywords(newsSettings.custom_keywords ?? []);
      }
      
      if (primaryLocation) {
        // Parse location string (format: "City, Province, Country")
        const parts = primaryLocation.split(",").map(p => p.trim());
        if (parts.length >= 2) {
          setCity(parts[0]);
          // Find province code from name
          const provinceName = parts[1];
          const found = CANADIAN_PROVINCES.find(p => 
            p.name.toLowerCase() === provinceName.toLowerCase() ||
            p.code.toLowerCase() === provinceName.toLowerCase()
          );
          if (found) setProvince(found.code);
        }
      }
      
      setIndustryType(organization.industry_type ?? "");
    }
  }, [organization]);

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    setCategories(prev => ({ ...prev, [categoryId]: checked }));
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (trimmed && !customKeywords.includes(trimmed) && customKeywords.length < 10) {
      setCustomKeywords(prev => [...prev, trimmed]);
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setCustomKeywords(prev => prev.filter(k => k !== keyword));
  };

  const handleSave = async () => {
    if (!organization) return;

    const provinceName = CANADIAN_PROVINCES.find(p => p.code === province)?.name ?? province;
    const primaryLocation = city && province ? `${city}, ${provinceName}, Canada` : null;

    const newsSettings: NewsSettings = {
      enabled,
      monitoring_radius_km: radiusKm,
      categories: categories as NewsSettings["categories"],
      custom_keywords: customKeywords,
      alert_severity: ["critical", "high", "medium"],
      notify_high_priority: true,
    };

    try {
      await updateOrg.mutateAsync({
        primary_location: primaryLocation,
        industry_type: industryType || null,
        news_settings: newsSettings,
      });
      toast({ title: "Regional intelligence settings saved" });
    } catch (error) {
      toast({ title: "Error saving settings", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Only show for Canadian organizations
  const isCanadian = organization?.region?.toLowerCase().includes("canada");
  if (!isCanadian) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-accent" />
            Regional Risk Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Regional Risk Intelligence is currently available for Canadian organizations only. 
              More regions coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-accent" />
              Regional Risk Intelligence
            </CardTitle>
            <CardDescription className="mt-1">
              Monitor real-time weather alerts, news, and regional risks for your location
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label="Enable regional risk intelligence"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Primary Location
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="province">Province/Territory</Label>
              <Select value={province} onValueChange={setProvince} disabled={!enabled}>
                <SelectTrigger id="province">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {CANADIAN_PROVINCES.map(prov => (
                    <SelectItem key={prov.code} value={prov.code}>
                      {prov.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g., Toronto"
                value={city}
                onChange={e => setCity(e.target.value)}
                disabled={!enabled}
              />
            </div>
          </div>
        </div>

        {/* Monitoring Radius */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Monitoring Radius: {radiusKm} km</Label>
          </div>
          <Slider
            value={[radiusKm]}
            onValueChange={([val]) => setRadiusKm(val)}
            min={25}
            max={500}
            step={25}
            disabled={!enabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>25 km</span>
            <span>500 km</span>
          </div>
        </div>

        {/* Industry Type */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Industry Classification
          </div>
          <Select value={industryType} onValueChange={setIndustryType} disabled={!enabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry type" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Industry-specific news and alerts will be prioritized based on your selection
          </p>
        </div>

        {/* Alert Categories */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Alert Categories
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALERT_CATEGORIES.map(cat => (
              <div key={cat.id} className="flex items-start space-x-3">
                <Checkbox
                  id={cat.id}
                  checked={categories[cat.id] ?? false}
                  onCheckedChange={(checked) => handleCategoryToggle(cat.id, checked === true)}
                  disabled={!enabled}
                />
                <div className="space-y-0.5">
                  <Label htmlFor={cat.id} className="text-sm font-medium cursor-pointer">
                    {cat.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Keywords */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Custom Keywords
            <span className="text-xs text-muted-foreground">({customKeywords.length}/10)</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add keyword (e.g., supply chain)"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddKeyword())}
              disabled={!enabled || customKeywords.length >= 10}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddKeyword}
              disabled={!enabled || !newKeyword.trim() || customKeywords.length >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {customKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customKeywords.map(keyword => (
                <Badge key={keyword} variant="secondary" className="gap-1 pr-1">
                  {keyword}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                    disabled={!enabled}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            News matching these keywords will be highlighted in your feed
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updateOrg.isPending}
          className="w-full"
        >
          {updateOrg.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
