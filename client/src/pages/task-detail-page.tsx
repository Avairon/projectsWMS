import { useTask } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Clock, Calendar, User, ChevronDown, Paperclip, FileText } from "lucide-react";
import { TASK_STATUS, insertReportSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { format } from "date-fns";

export default function TaskDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { task, isLoading, updateTask, createReport } = useTask(id);
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const reportForm = useForm<z.infer<typeof insertReportSchema>>({
    resolver: zodResolver(insertReportSchema),
    defaultValues: {
      workDone: "",
      plans: "",
      comment: "",
    },
  });

  if (isLoading || !task) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const onSubmitReport = (data: z.infer<typeof insertReportSchema>) => {
    createReport.mutate({
      ...data,
      taskId: id,
      userId: user!.id,
      userName: user!.name,
      reportedAt: new Date().toISOString(),
    }, {
      onSuccess: () => {
        setReportOpen(false);
        reportForm.reset();
      }
    });
  };

  const statusColors = {
    [TASK_STATUS.ACTIVE]: "bg-blue-600",
    [TASK_STATUS.COMPLETED]: "bg-green-600",
    [TASK_STATUS.DEFERRED]: "bg-orange-500",
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/tasks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{task.title}</h1>
            <Badge className={statusColors[task.status as keyof typeof statusColors]}>
              {task.status}
            </Badge>
          </div>
          <Link href={`/projects/${task.project.id}`} className="text-blue-600 hover:underline text-sm font-medium">
            {task.project.name}
          </Link>
        </div>
        <div className="flex gap-2">
          {task.status !== TASK_STATUS.COMPLETED && (
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => updateTask.mutate({ status: TASK_STATUS.COMPLETED })}
            >
              Завершить задачу
            </Button>
          )}
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Отправить отчет</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Новый отчет по задаче</DialogTitle>
              </DialogHeader>
              <Form {...reportForm}>
                <form onSubmit={reportForm.handleSubmit(onSubmitReport)} className="space-y-4">
                  <FormField
                    control={reportForm.control}
                    name="workDone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Сделано</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Что было выполнено..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={reportForm.control}
                    name="plans"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Запланировано</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Планы на следующий этап..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={reportForm.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Комментарий (опционально)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Дополнительная информация..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">Отправить</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Описание</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap">{task.description || "Описание отсутствует"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Отчеты ({task.reports?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.reports?.map((report, index) => (
                <div key={report.id} className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">#{index + 1}</Badge>
                      <span className="font-semibold text-sm">{report.userName}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {format(new Date(report.reportedAt), 'dd.MM.yyyy HH:mm')}
                    </span>
                  </div>
                  
                  {report.workDone && (
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Сделано:</span>
                      <p className="text-sm mt-1">{report.workDone}</p>
                    </div>
                  )}
                  
                  {report.plans && (
                    <div className="mb-2">
                      <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">В планах:</span>
                      <p className="text-sm mt-1">{report.plans}</p>
                    </div>
                  )}

                  {report.comment && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-sm text-slate-500 italic">{report.comment}</p>
                    </div>
                  )}
                </div>
              ))}
              {task.reports?.length === 0 && (
                <div className="text-center py-4 text-slate-500 text-sm">Отчетов пока нет</div>
              )}
            </CardContent>
          </Card>

          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-slate-900">История изменений</h3>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {task.history?.map((h) => (
                      <div key={h.id} className="p-3 text-sm flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{h.userName}</span>
                          <span className="text-slate-600">{h.action}</span>
                        </div>
                        <span className="text-xs text-slate-400">{h.date}</span>
                      </div>
                    ))}
                    {task.history?.length === 0 && <div className="p-4 text-center text-xs text-slate-400">История пуста</div>}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Детали</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Дедлайн</span>
                  <span className="font-medium">{task.deadline}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Создано</span>
                  <span className="font-medium">{task.createdAt.split('T')[0]}</span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Исполнитель</span>
                  <span className="font-medium">{task.assignee?.name || "Не назначен"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <span className="text-xs text-slate-500 block">Автор</span>
                  <span className="font-medium">{task.creator?.name || "Система"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
