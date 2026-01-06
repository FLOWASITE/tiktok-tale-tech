import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  AudienceFormData,
  INTEREST_CATEGORIES,
  BEHAVIOR_OPTIONS,
  LIFE_EVENT_OPTIONS,
  VIETNAM_LOCATIONS,
  GENDER_OPTIONS,
  INCOME_LEVEL_OPTIONS,
  DEVICE_TYPE_OPTIONS,
  formatAudienceSummary,
  estimateReach
} from '@/types/audience';
import { 
  Users, MapPin, Target, Heart, Smartphone, 
  ChevronDown, X, Save, Sparkles
} from 'lucide-react';

interface AudienceBuilderProps {
  value?: Partial<AudienceFormData>;
  onChange: (data: AudienceFormData) => void;
  onSave?: (data: AudienceFormData) => void;
  showSaveButton?: boolean;
  compact?: boolean;
}

const defaultFormData: AudienceFormData = {
  name: '',
  age_min: 18,
  age_max: 45,
  genders: ['all'],
  locations: ['vietnam'],
  languages: ['vi'],
  interests: [],
  behaviors: [],
  life_events: [],
  income_levels: [],
  education_levels: [],
  device_types: [],
  exclude_interests: [],
  exclude_behaviors: [],
};

export function AudienceBuilder({ 
  value, 
  onChange, 
  onSave,
  showSaveButton = false,
  compact = false 
}: AudienceBuilderProps) {
  const [formData, setFormData] = useState<AudienceFormData>({
    ...defaultFormData,
    ...value,
  });
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    demographics: true,
    interests: false,
    behaviors: false,
    advanced: false,
  });

  const updateField = <K extends keyof AudienceFormData>(
    field: K, 
    value: AudienceFormData[K]
  ) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange(newData);
  };

  const toggleArrayItem = <K extends keyof AudienceFormData>(
    field: K, 
    item: string
  ) => {
    const current = formData[field] as string[];
    const newValue = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    updateField(field, newValue as AudienceFormData[K]);
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const estimatedReach = estimateReach(formData);

  const handleSave = () => {
    if (onSave && formData.name) {
      onSave(formData);
    }
  };

  return (
    <div className={cn("space-y-3", compact && "text-sm")}>
      {/* Summary & Reach */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50 border">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Đối tượng mục tiêu</p>
          <p className="text-sm font-medium truncate">
            {formatAudienceSummary(formData)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Est. Reach</p>
          <p className="text-sm font-semibold text-primary">
            {(estimatedReach.min / 1000).toFixed(0)}K - {(estimatedReach.max / 1000).toFixed(0)}K
          </p>
        </div>
      </div>

      <ScrollArea className={cn("pr-2", compact ? "max-h-[300px]" : "max-h-[400px]")}>
        <div className="space-y-2">
          {/* Demographics Section */}
          <Collapsible open={openSections.demographics} onOpenChange={() => toggleSection('demographics')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Nhân khẩu học</span>
                {(formData.genders.length > 0 || formData.age_min || formData.age_max) && (
                  <Badge variant="secondary" className="text-xs">
                    {formData.genders.filter(g => g !== 'all').length > 0 ? formData.genders[0] : 'all'}, {formData.age_min}-{formData.age_max}t
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.demographics && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pt-3 pb-2 space-y-4">
              {/* Gender */}
              <div>
                <Label className="text-xs mb-2 block">Giới tính</Label>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map(option => (
                    <Badge
                      key={option.value}
                      variant={formData.genders.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => {
                        if (option.value === 'all') {
                          updateField('genders', ['all']);
                        } else {
                          const newGenders = formData.genders.filter(g => g !== 'all');
                          if (newGenders.includes(option.value)) {
                            updateField('genders', newGenders.filter(g => g !== option.value));
                          } else {
                            updateField('genders', [...newGenders, option.value]);
                          }
                        }
                      }}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Age Range */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Độ tuổi</Label>
                  <span className="text-xs font-medium">{formData.age_min} - {formData.age_max}+</span>
                </div>
                <div className="px-2">
                  <Slider
                    value={[formData.age_min || 18, formData.age_max || 65]}
                    min={13}
                    max={65}
                    step={1}
                    onValueChange={([min, max]) => {
                      updateField('age_min', min);
                      updateField('age_max', max);
                    }}
                  />
                </div>
              </div>

              {/* Locations */}
              <div>
                <Label className="text-xs mb-2 block">Vị trí</Label>
                <div className="flex flex-wrap gap-1.5">
                  {VIETNAM_LOCATIONS.slice(0, 8).map(location => (
                    <Badge
                      key={location.value}
                      variant={formData.locations.includes(location.value) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleArrayItem('locations', location.value)}
                    >
                      {location.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Interests Section */}
          <Collapsible open={openSections.interests} onOpenChange={() => toggleSection('interests')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="font-medium">Sở thích</span>
                {formData.interests.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {formData.interests.length} đã chọn
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.interests && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pt-3 pb-2 space-y-3">
              {INTEREST_CATEGORIES.map(category => (
                <div key={category.category}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{category.category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {category.interests.map(interest => (
                      <Badge
                        key={interest}
                        variant={formData.interests.includes(interest) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleArrayItem('interests', interest)}
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Behaviors Section */}
          <Collapsible open={openSections.behaviors} onOpenChange={() => toggleSection('behaviors')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <span className="font-medium">Hành vi</span>
                {formData.behaviors.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {formData.behaviors.length} đã chọn
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.behaviors && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pt-3 pb-2 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {BEHAVIOR_OPTIONS.map(behavior => (
                  <Badge
                    key={behavior.value}
                    variant={formData.behaviors.includes(behavior.value) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleArrayItem('behaviors', behavior.value)}
                  >
                    {behavior.label}
                  </Badge>
                ))}
              </div>
              
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Sự kiện cuộc sống</p>
                <div className="flex flex-wrap gap-1.5">
                  {LIFE_EVENT_OPTIONS.map(event => (
                    <Badge
                      key={event.value}
                      variant={formData.life_events.includes(event.value) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleArrayItem('life_events', event.value)}
                    >
                      {event.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Advanced Section */}
          <Collapsible open={openSections.advanced} onOpenChange={() => toggleSection('advanced')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-purple-500" />
                <span className="font-medium">Nâng cao</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.advanced && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pt-3 pb-2 space-y-3">
              {/* Income Levels */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Thu nhập</p>
                <div className="flex flex-wrap gap-1.5">
                  {INCOME_LEVEL_OPTIONS.map(income => (
                    <Badge
                      key={income.value}
                      variant={formData.income_levels.includes(income.value) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleArrayItem('income_levels', income.value)}
                    >
                      {income.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Device Types */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Thiết bị</p>
                <div className="flex flex-wrap gap-1.5">
                  {DEVICE_TYPE_OPTIONS.map(device => (
                    <Badge
                      key={device.value}
                      variant={formData.device_types.includes(device.value) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleArrayItem('device_types', device.value)}
                    >
                      {device.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Save Button */}
      {showSaveButton && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <Input
            placeholder="Tên audience template..."
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="flex-1"
          />
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={!formData.name}
          >
            <Save className="h-4 w-4 mr-1" />
            Lưu
          </Button>
        </div>
      )}
    </div>
  );
}
