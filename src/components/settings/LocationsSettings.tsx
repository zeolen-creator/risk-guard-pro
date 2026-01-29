import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, MapPin, Building2, Trash2, Users, Edit } from "lucide-react";
import { useOrganizationLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, OrganizationLocation } from "@/hooks/useOrganizationLocations";
import { CANADIAN_PROVINCES } from "@/constants/canadianProvinces";

export function LocationsSettings() {
  const { data: locations, isLoading } = useOrganizationLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OrganizationLocation | null>(null);
  const [formData, setFormData] = useState({
    location_name: "",
    address: "",
    city: "",
    province: "",
    country: "Canada",
    is_headquarters: false,
    employee_count: 0,
    geographic_risks: {},
  });

  const resetForm = () => {
    setFormData({
      location_name: "",
      address: "",
      city: "",
      province: "",
      country: "Canada",
      is_headquarters: false,
      employee_count: 0,
      geographic_risks: {},
    });
    setEditingLocation(null);
  };

  const handleSubmit = async () => {
    if (editingLocation) {
      await updateLocation.mutateAsync({ id: editingLocation.id, ...formData });
    } else {
      await createLocation.mutateAsync(formData);
    }
    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = (location: OrganizationLocation) => {
    setEditingLocation(location);
    setFormData({
      location_name: location.location_name,
      address: location.address || "",
      city: location.city || "",
      province: location.province || "",
      country: location.country,
      is_headquarters: location.is_headquarters,
      employee_count: location.employee_count || 0,
      geographic_risks: location.geographic_risks,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this location?")) {
      await deleteLocation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Organization Locations</h3>
          <p className="text-sm text-muted-foreground">
            Manage your organization's facilities and locations for location-specific risk assessments.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingLocation ? "Edit Location" : "Add New Location"}</DialogTitle>
              <DialogDescription>
                {editingLocation ? "Update the location details." : "Add a new facility or office location."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="location_name">Location Name *</Label>
                <Input
                  id="location_name"
                  value={formData.location_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                  placeholder="e.g., Head Office, Warehouse A"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Toronto"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="province">Province/Territory</Label>
                  <Select
                    value={formData.province}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, province: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {CANADIAN_PROVINCES.map((prov) => (
                        <SelectItem key={prov.code} value={prov.code}>
                          {prov.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="employee_count">Employee Count</Label>
                <Input
                  id="employee_count"
                  type="number"
                  value={formData.employee_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_count: parseInt(e.target.value) || 0 }))}
                  placeholder="50"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_headquarters">Headquarters</Label>
                  <p className="text-xs text-muted-foreground">Mark this as the main headquarters location</p>
                </div>
                <Switch
                  id="is_headquarters"
                  checked={formData.is_headquarters}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_headquarters: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.location_name || createLocation.isPending || updateLocation.isPending}
              >
                {(createLocation.isPending || updateLocation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingLocation ? "Save Changes" : "Add Location"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!locations?.length ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Locations Added</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Add your organization's facilities to enable location-specific risk assessments and geographic risk analysis.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {locations.map((location) => (
            <Card key={location.id} className="bg-card/50 border-border/50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${location.is_headquarters ? "bg-primary/20" : "bg-muted"}`}>
                    <Building2 className={`h-5 w-5 ${location.is_headquarters ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{location.location_name}</span>
                      {location.is_headquarters && (
                        <Badge variant="secondary" className="text-xs">HQ</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {[location.city, location.province, location.country].filter(Boolean).join(", ")}
                    </div>
                    {location.employee_count && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Users className="h-3 w-3" />
                        {location.employee_count} employees
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(location.id)}
                    disabled={deleteLocation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
