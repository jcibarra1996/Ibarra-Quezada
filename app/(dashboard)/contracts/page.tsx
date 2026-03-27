import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Contratos</h1>
        <Button size="sm">Nuevo contrato</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Lista de contratos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Conecta Supabase para visualizar los contratos.
          </p>
        </CardContent>
      </Card>

      {/* Example row */}
      <Card>
        <CardContent className="pt-6 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Contrato de ejemplo</p>
            <p className="text-xs text-muted-foreground">Vence: 2026-12-31</p>
          </div>
          <Badge variant="outline">activo</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
