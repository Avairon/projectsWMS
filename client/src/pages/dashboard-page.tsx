import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useDirections, useUsers } from "@/hooks/use-resources";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Search, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Filter
} from "lucide-react";
import { PROJECT_STATUS } from "@shared/schema";

export default function DashboardPage() {
  const { projects } = useProjects();
  const { data: tasks } = useTasks();
  const { directions } = useDirections();
  const { data: users } = useUsers();

  const [search, setSearch] = useState("");
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const [filterManager, setFilterManager] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesDirection = filterDirection === "all" || p.direction === filterDirection;
      const matchesManager = filterManager === "all" || p.managerId?.toString() === filterManager;
      const matchesStatus = filterStatus === "all" || p.status === filterStatus;
      
      return matchesSearch && matchesDirection && matchesManager && matchesStatus;
    });
  }, [projects, search, filterDirection, filterManager, filterStatus]);

  const stats = useMemo(() => {
    if (!projects) return { total: 0, inProgress: 0, completed: 0, paused: 0 };
    return {
      total: projects.length,
      inProgress: projects.filter(p => p.status === PROJECT_STATUS.IN_PROGRESS).length,
      completed: projects.filter(p => p.status === PROJECT_STATUS.COMPLETED).length,
      paused: projects.filter(p => p.status === PROJECT_STATUS.PAUSED).length,
    };
  }, [projects]);

  const resetFilters = () => {
    setSearch("");
    setFilterDirection("all");
    setFilterManager("all");
    setFilterStatus("all");
  };

  const COLORS = ['#3498db', '#27ae60', '#e67e22', '#e74c3c'];

  if (!projects || !users || !directions) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Дашборд</h1>
        <p className="text-slate-500">Обзор всех проектов и статистика</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="bg-white border-l-4 border-l-blue-500 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={resetFilters}
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Всего проектов</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Завершено</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.completed}</h3>
            </div>
            <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-green-500">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">В работе</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.inProgress}</h3>
            </div>
            <div className="h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Приостановлено</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.paused}</h3>
            </div>
            <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Поиск по названию..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={filterDirection} onValueChange={setFilterDirection}>
              <SelectTrigger>
                <SelectValue placeholder="Направление" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все направления</SelectItem>
                {directions.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterManager} onValueChange={setFilterManager}>
              <SelectTrigger>
                <SelectValue placeholder="Руководитель проекта" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все руководители</SelectItem>
                {managers.map(u => (
                  <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.values(PROJECT_STATUS).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjects.map(project => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="hover:shadow-lg transition-all duration-300 border-l-4 cursor-pointer group"
              style={{ 
                borderLeftColor: project.status === PROJECT_STATUS.COMPLETED ? '#27ae60' : 
                               project.status === PROJECT_STATUS.PAUSED ? '#e74c3c' : '#3498db'
              }}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{project.description}</p>
                  </div>
                  <Badge variant="outline" className={
                    project.status === PROJECT_STATUS.COMPLETED ? "bg-green-50 text-green-700 border-green-200" :
                    project.status === PROJECT_STATUS.PAUSED ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  }>
                    {project.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs mb-1">Руководитель проекта</span>
                    <span className="font-medium text-slate-700">{project.manager.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs mb-1">Направление</span>
                    <span className="font-medium text-slate-700">{project.direction}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs mb-1">Срок сдачи</span>
                    <span className="font-medium text-slate-700">{project.endDate || "Не задан"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs mb-1">Команда</span>
                    <span className="font-medium text-slate-700">{project.team?.length || 0} чел.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filteredProjects.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            Проекты не найдены. Попробуйте изменить фильтры.
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Статус проектов</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'В работе', value: stats.inProgress },
                    { name: 'Завершено', value: stats.completed },
                    { name: 'Приостановлено', value: stats.paused },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {/* Matching COLORS to the status */}
                  <Cell fill="#3498db" /> {/* In Progress */}
                  <Cell fill="#27ae60" /> {/* Completed */}
                  <Cell fill="#e74c3c" /> {/* Paused */}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Направления деятельности</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={directions.map(d => ({
                  name: d.name,
                  count: projects.filter(p => p.direction === d.name).length
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3498db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
