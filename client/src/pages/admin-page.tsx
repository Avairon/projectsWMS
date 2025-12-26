import { useDirections, useTokens, useUsers } from "@/hooks/use-resources";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertDirectionSchema, ROLES } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { directions, createDirection, deleteDirection } = useDirections();
  const { tokens, generateToken } = useTokens();
  const { data: users } = useUsers();
  const { toast } = useToast();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const directionForm = useForm<z.infer<typeof insertDirectionSchema>>({
    resolver: zodResolver(insertDirectionSchema),
    defaultValues: { name: "" },
  });

  const tokenForm = useForm({
    defaultValues: { role: "worker", projectId: "none" },
  });

  const onCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedToken(code);
    toast({ title: "Скопировано", description: "Токен скопирован в буфер обмена" });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Администрирование</h1>
        <p className="text-slate-500">Управление пользователями, направлениями и доступом</p>
      </div>

      <Tabs defaultValue="tokens" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tokens">Токены регистрации</TabsTrigger>
          <TabsTrigger value="directions">Направления</TabsTrigger>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Генерация токена</CardTitle>
                <CardDescription>Создайте токен для регистрации нового сотрудника</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...tokenForm}>
                  <form onSubmit={tokenForm.handleSubmit((data) => {
                    generateToken.mutate({
                      role: data.role as any,
                      projectId: data.projectId === "none" ? undefined : Number(data.projectId)
                    });
                  })} className="space-y-4">
                    <FormField
                      control={tokenForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Роль</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите роль" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">Администратор</SelectItem>
                              <SelectItem value="manager">Руководитель проекта</SelectItem>
                              <SelectItem value="supervisor">Куратор направления</SelectItem>
                              <SelectItem value="worker">Исполнитель</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={generateToken.isPending}>
                      Сгенерировать
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Активные токены</CardTitle>
                <CardDescription>Неиспользованные токены для регистрации</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Роль</TableHead>
                      <TableHead>Код</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens?.filter(t => !t.isUsed).map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="capitalize">
                          {token.role === 'admin' ? 'Админ' : 
                           token.role === 'manager' ? 'Руководитель' : 
                           token.role === 'supervisor' ? 'Куратор' : 'Исполнитель'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{token.code}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => onCopy(token.code)}>
                            {copiedToken === token.code ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="directions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Создать направление</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...directionForm}>
                  <form onSubmit={directionForm.handleSubmit((data) => {
                    createDirection.mutate(data);
                    directionForm.reset();
                  })} className="space-y-4">
                    <FormField
                      control={directionForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название</FormLabel>
                          <FormControl>
                            <Input placeholder="IT Разработка" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createDirection.isPending}>
                      <Plus className="w-4 h-4 mr-2" /> Добавить
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Список направлений</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {directions?.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.name}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteDirection.mutate(d.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Все пользователи</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Логин</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Дата регистрации</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell className="capitalize">
                         {u.role === 'admin' ? 'Администратор' : 
                           u.role === 'manager' ? 'Руководитель' : 
                           u.role === 'supervisor' ? 'Куратор' : 'Исполнитель'}
                      </TableCell>
                      <TableCell>{new Date(u.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
