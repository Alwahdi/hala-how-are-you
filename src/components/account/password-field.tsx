import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PasswordField({ ar, ...props }: ComponentProps<typeof Input> & { ar: boolean }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? (ar ? 'إخفاء كلمة المرور' : 'Hide password') : (ar ? 'إظهار كلمة المرور' : 'Show password');
  return <div className="relative" dir="ltr">
    <Input {...props} type={visible ? 'text' : 'password'} className="h-12 bg-card pe-12" />
    <Button type="button" variant="ghost" size="icon" className="absolute end-1 top-1 size-10 text-muted-foreground" aria-label={label} title={label} aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</Button>
  </div>;
}