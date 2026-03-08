import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search } from "lucide-react";
import { format } from "date-fns";

interface StudentData {
  user_id: string;
  student_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  created_at: string;
  active_borrows: number;
  total_borrows: number;
}

const RegisteredStudents = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      // Get all student profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!profiles) { setLoading(false); return; }

      // Get student role user IDs
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      const studentUserIds = new Set(roles?.map(r => r.user_id) ?? []);

      // Get borrow stats
      const { data: borrows } = await supabase
        .from("borrow_records")
        .select("user_id, status");

      const borrowStats = new Map<string, { active: number; total: number }>();
      borrows?.forEach(b => {
        const stat = borrowStats.get(b.user_id) ?? { active: 0, total: 0 };
        stat.total++;
        if (b.status === "borrowed" || b.status === "return_requested") stat.active++;
        borrowStats.set(b.user_id, stat);
      });

      const studentData: StudentData[] = profiles
        .filter(p => studentUserIds.has(p.user_id))
        .map(p => ({
          user_id: p.user_id,
          student_id: (p as any).student_id ?? null,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          department: p.department,
          created_at: p.created_at,
          active_borrows: borrowStats.get(p.user_id)?.active ?? 0,
          total_borrows: borrowStats.get(p.user_id)?.total ?? 0,
        }));

      setStudents(studentData);
      setLoading(false);
    };

    fetchStudents();
  }, []);

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.student_id?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (s.department?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl text-secondary">REGISTERED STUDENTS</h1>
            <p className="text-muted-foreground mt-1">View all student registrations and activity</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2 gap-2">
            <Users className="h-5 w-5" />
            {students.length} Students
          </Badge>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, email, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl text-secondary">ALL STUDENTS</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Active Borrows</TableHead>
                      <TableHead>Total Borrows</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={s.user_id}>
                        <TableCell className="font-mono font-semibold">{s.student_id ?? "—"}</TableCell>
                        <TableCell className="font-medium">{s.full_name}</TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell>{s.phone ?? "—"}</TableCell>
                        <TableCell>{s.department ?? "—"}</TableCell>
                        <TableCell>{format(new Date(s.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge className={s.active_borrows > 0 ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"}>
                            {s.active_borrows}
                          </Badge>
                        </TableCell>
                        <TableCell>{s.total_borrows}</TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          {search ? "No students match your search" : "No students registered yet"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RegisteredStudents;
