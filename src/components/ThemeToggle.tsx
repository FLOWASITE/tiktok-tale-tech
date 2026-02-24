import { Moon, Sun, Leaf, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const getThemeIcon = () => {
    switch (theme) {
      case "dark": return <Moon className="h-4 w-4" />;
      case "lime": return <Leaf className="h-4 w-4" />;
      case "system": return <Monitor className="h-4 w-4" />;
      default: return <Sun className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case "dark": return t('app.theme.dark');
      case "lime": return t('app.theme.lime');
      case "system": return t('app.theme.system');
      default: return t('app.theme.light');
    }
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              {getThemeIcon()}
              <span className="sr-only">{t('app.theme.toggle')}</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Theme: {getThemeLabel()}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="h-4 w-4" />
          {t('app.theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="h-4 w-4" />
          {t('app.theme.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("lime")} className="gap-2">
          <Leaf className="h-4 w-4" />
          {t('app.theme.lime')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor className="h-4 w-4" />
          {t('app.theme.system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
