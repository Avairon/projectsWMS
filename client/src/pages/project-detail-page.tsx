import { useProject } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, AlertCircle, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { PROJECT_STATUS, TASK_STATUS } from "@shared/schema";
import { format, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { project, isLoading } = useProject(id);
  const { data: tasks } = useTasks(id);

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Gantt Chart Logic (Simplified)
  const taskDates = tasks?.map(t => ({
    id: t.id,
    title: t.title,
    start: new Date(t.startDate?.split('.').reverse().join('-') || ''),
    end: new Date(t.deadline.split('.').reverse().join('-')),
    status: t.status
  })).sort((a, b) => a.start.getTime() - b.start.getTime()) || [];

  const minDate = taskDates.length > 0 ? taskDates[0].start : new Date();
  const maxDate = taskDates.length > 0 
    ? taskDates.reduce((max, t) => t.end > max ? t.end : max, taskDates[0].end)
    : new Date();
  
  const totalDays = differenceInDays(maxDate, minDate) + 5; // buffer

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
            <Badge className={
              project.status === PROJECT_STATUS.COMPLETED ? "bg-green-600" :
              project.status === PROJECT_STATUS.PAUSED ? "bg-red-600" :
              "bg-blue-600"
            }>
              {project.status}
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">{project.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Gantt Chart / Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>График выполнения работ</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[600px] space-y-4">
                {taskDates.map(task => {
                  const offset = differenceInDays(task.start, minDate);
                  const duration = differenceInDays(task.end, task.start);
                  const widthPercentage = (duration / totalDays) * 100;
                  const leftPercentage = (offset / totalDays) * 100;

                  return (
                    <div key={task.id} className="relative h-10 flex items-center">
                      <div className="w-1/4 pr-4 truncate text-sm font-medium" title={task.title}>
                        {task.title}
                      </div>
                      <div className="w-3/4 h-6 bg-slate-100 rounded-full relative">
                        <div 
                          className={`absolute top-0 bottom-0 rounded-full flex items-center px-2 text-xs text-white truncate
                            ${task.status === TASK_STATUS.COMPLETED ? 'bg-green-500' : 
                              task.status === TASK_STATUS.DEFERRED ? 'bg-orange-400' : 'bg-blue-500'}`}
                          style={{
                            left: `${leftPercentage}%`,
                            width: `${Math.max(widthPercentage, 2)}%`
                          }}
                        >
                          {format(task.start, 'dd.MM')} - {format(task.end, 'dd.MM')}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {taskDates.length === 0 && <div className="text-center text-slate-500 py-8">Нет задач для отображения на графике</div>}
              </div>
            </CardContent>
          </Card>

          {/* Task List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Задачи проекта</CardTitle>
              <Link href={`/tasks?projectId=${project.id}`}>
                <Button variant="outline" size="sm">Все задачи</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks?.map(task => (
                  <Link key={task.id} href={`/tasks/${task.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          task.status === TASK_STATUS.COMPLETED ? 'bg-green-500' : 
                          task.status === TASK_STATUS.DEFERRED ? 'bg-orange-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{task.title}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <CalendarIcon className="w-3 h-3" />
                            {task.deadline}
                            <span className="mx-1">•</span>
                            <span>{task.assignee?.name || 'Не назначен'}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">{task.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-slate-500 block">Направление</span>
                <span className="font-medium">{project.direction}</span>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-slate-500 block">Руководитель проекта</span>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {project.manager.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{project.manager.name}</span>
                </div>
              </div>
              {project.supervisor && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-slate-500 block">Куратор направления</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-purple-100 text-purple-700">
                          {project.supervisor.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{project.supervisor.name}</span>
                    </div>
                  </div>
                </>
              )}
              <Separator />
              <div>
                <span className="text-sm text-slate-500 block">Команда</span>
                <div className="flex -space-x-2 mt-2 overflow-hidden py-1">
                  {project.teamMembers?.map((member, i) => (
                    <Avatar key={member.id} className="border-2 border-white w-8 h-8">
                      <AvatarFallback className="bg-slate-200 text-xs">{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {(project.teamMembers?.length || 0) === 0 && <span className="text-sm text-slate-400">Команда не назначена</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Цели</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-slate-700">{project.expectedResult || "Не указаны"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
