import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending: "outline",
  expired: "destructive",
  cancelled: "secondary",
};

export default async function ContractsPage() {
  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("*")
    .order("expiration_date", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Contratos</h1>
        <Button size="sm">Nuevo contrato</Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">Error al cargar contratos: {error.message}</p>
      )}

      {!error && contracts?.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No hay contratos registrados aún.</p>
          </CardContent>
        </Card>
      )}

      {contracts?.map((contract) => (
        <Card key={contract.id}>
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">{contract.name}</p>
              <p className="text-xs text-muted-foreground">
                Vence: {new Date(contract.expiration_date).toLocaleDateString("es-MX")}
              </p>
            </div>
            <Badge variant={statusVariant[contract.status] ?? "outline"}>
              {contract.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
