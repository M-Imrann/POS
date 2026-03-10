import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Mail, MessageCircle } from "lucide-react";
import type { CartItem } from "@/context/ProductContext";
import { toast } from "sonner";

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  saleId: string;
  date: string;
}

export default function ReceiptDialog({
  open,
  onOpenChange,
  items,
  subtotal,
  tax,
  discount,
  total,
  saleId,
  date,
}: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const receiptText = () => {
    let text = `RECEIPT - ${saleId}\n`;
    text += `Date: ${date}\n`;
    text += `${"─".repeat(32)}\n`;
    items.forEach((item) => {
      text += `${item.product.name} x${item.quantity} - $${(item.product.price * item.quantity).toFixed(2)}\n`;
    });
    text += `${"─".repeat(32)}\n`;
    text += `Subtotal: $${subtotal.toFixed(2)}\n`;
    text += `Tax (8%): $${tax.toFixed(2)}\n`;
    if (discount > 0) text += `Discount: -$${discount.toFixed(2)}\n`;
    text += `TOTAL: $${total.toFixed(2)}\n`;
    text += `\nThank you for your purchase!`;
    return text;
  };

  const handleDownload = () => {
    const blob = new Blob([receiptText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${saleId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded!");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Receipt - ${saleId}`);
    const body = encodeURIComponent(receiptText());
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(receiptText());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>

        <div
          ref={receiptRef}
          className="bg-card border border-border rounded-lg p-5 space-y-3 font-mono text-sm"
        >
          <div className="text-center space-y-1">
            <h3 className="font-bold text-base tracking-wide">RECEIPT</h3>
            <p className="text-xs text-muted-foreground">{saleId}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>

          <div className="border-t border-dashed border-border pt-3 space-y-2">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-xs">
                <span className="flex-1 truncate pr-2">
                  {item.product.name} × {item.quantity}
                </span>
                <span className="font-medium shrink-0">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-dashed border-border pt-2">
              <span>TOTAL</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground pt-2">
            Thank you for your purchase!
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button variant="outline" onClick={handleDownload} className="gap-1.5 text-xs">
            <Download className="w-4 h-4" /> Download
          </Button>
          <Button variant="outline" onClick={handleShareEmail} className="gap-1.5 text-xs">
            <Mail className="w-4 h-4" /> Email
          </Button>
          <Button variant="outline" onClick={handleShareWhatsApp} className="gap-1.5 text-xs">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
