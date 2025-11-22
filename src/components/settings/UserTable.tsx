import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead,
  TableCell
} from "@/components/ui/table";
import { CheckCircle2, XCircle } from "lucide-react";
import { User } from '@/lib/types';

interface UserTableProps {
  users: Omit<User, 'password'>[];
  isLoading: boolean;
  onEdit: (user: Omit<User, 'password'>) => void;
  onDelete: (id: string) => void;
}

export default function UserTable({
  users,
  isLoading,
  onEdit,
  onDelete
}: UserTableProps) {
  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-medium h-9 py-1 px-2">用户名</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">显示名称</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">创建时间</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">状态</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2 w-[90px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  加载中...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  没有找到用户数据
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium py-1.5 px-2">{user.username}</TableCell>
                  <TableCell className="py-1.5 px-2">{user.displayName}</TableCell>
                  <TableCell className="py-1.5 px-2">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="py-1.5 px-2">
                    <div className="flex items-center">
                      {user.isActive ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">活跃</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-500">
                          <XCircle className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">禁用</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-right">
                    <div className="flex space-x-1 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(user)}
                        className="h-7 px-2 text-xs"
                      >
                        编辑
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(user.id)}
                        className="h-7 px-2 text-xs"
                        disabled={users.length <= 1}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 