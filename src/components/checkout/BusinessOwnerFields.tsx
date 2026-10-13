import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BusinessOwnerFieldsProps {
  businessName: string;
  onBusinessNameChange: (value: string) => void;
  idPrefix?: string;
}

const BusinessOwnerFields = ({
  businessName,
  onBusinessNameChange,
  idPrefix = "biz",
}: BusinessOwnerFieldsProps) => {
  return (
    <div>
      <Label htmlFor={`${idPrefix}-name`}>
        Business name{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <Input
        id={`${idPrefix}-name`}
        value={businessName}
        onChange={(event) => onBusinessNameChange(event.target.value)}
        placeholder="John Lake Boutique"
        autoComplete="organization"
        className={cn("mt-2 input-elegant")}
      />
    </div>
  );
};

export default BusinessOwnerFields;
