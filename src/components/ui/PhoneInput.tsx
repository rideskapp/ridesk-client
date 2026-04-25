import React from "react";
import PhoneInputWithCountry, { type Value, type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NO_COUNTRY_VALUE = "ZZ";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: Value) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultCountry?: Country;
  id?: string;
}

const FlagIcon = React.memo(({ country, className }: { country: Country | undefined; className?: string }) => {
  if (!country) return null;
  const Flag = flags[country] as React.ComponentType<{ title: string; className?: string }>;
  return Flag ? <Flag title={country} className={className} /> : null;
});
FlagIcon.displayName = "FlagIcon";

const CountrySelect = ({
  value,
  onChange,
  options,
  disabled,
}: {
  value?: Country;
  onChange: (v?: Country) => void;
  options: Array<{ value?: Country; label: string }>;
  disabled?: boolean;
}) => {
  const handleChange = (value: string) => {
    onChange(value === NO_COUNTRY_VALUE ? undefined : (value as Country));
  };

  return (
    <Select disabled={disabled} value={value || NO_COUNTRY_VALUE} onValueChange={handleChange}>
      <SelectTrigger className="w-[80px] h-10 mr-2 bg-background border border-input shadow-none rounded-r-none border-r-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-1 focus-visible:ring-ring">
        <SelectValue placeholder="Country">
          {value && (
            <span className="flex items-center justify-center w-full">
              <FlagIcon country={value} className="w-6 h-4" />
              <span className="sr-only">{value}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value || NO_COUNTRY_VALUE} value={option.value || NO_COUNTRY_VALUE}>
            <span className="flex items-center gap-2 truncate">
              <FlagIcon country={option.value} className="w-5 h-3" />
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
CountrySelect.displayName = "CountrySelect";

const InputWrapper = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      className={cn("rounded-l-none", className)}
      {...props}
    />
  )
);
InputWrapper.displayName = "InputWrapper";

const NOOP = () => undefined;

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  placeholder = "Phone number",
  disabled = false,
  className = "",
  defaultCountry = "US",
  id,
}) => {
  return (
    <div className={cn("relative", className)}>
      <div className="flex">
        <PhoneInputWithCountry
          id={id}
          value={value && value.startsWith("+") ? value : undefined}
          onChange={onChange || NOOP}
          international
          defaultCountry={defaultCountry}
          placeholder={placeholder}
          disabled={disabled}
          countrySelectComponent={CountrySelect}
          inputComponent={InputWrapper}
          className={cn(
            "flex w-full items-center",
            // Override default styles to match Shadcn
            "[&_.PhoneInputCountry]:mr-0"
          )}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

