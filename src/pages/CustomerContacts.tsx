import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, User, Calendar, Phone, Mail, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface ContactInfo {
  id: string;
  call_id: string;
  started_at: string;
  from_number: string;
  collected_data: any;
}

const CustomerContacts = () => {
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<string>("month");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    filterContactsByPeriod();
  }, [timePeriod, contacts]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calls')
        .select(`
          id,
          started_at,
          from_number,
          call_sessions!inner(collected_data)
        `)
        .not('call_sessions.collected_data', 'eq', '{}')
        .order('started_at', { ascending: false });

      if (error) throw error;

      const contactsData = data.map(call => ({
        id: call.id,
        call_id: call.id,
        started_at: call.started_at,
        from_number: call.from_number,
        collected_data: call.call_sessions[0]?.collected_data || {}
      })).filter(contact => {
        const data = contact.collected_data;
        return (
          (typeof data === 'object' && data !== null && !Array.isArray(data)) &&
          ((data as any).name || (data as any).phone || (data as any).email || (data as any).contact_info)
        );
      });

      setContacts(contactsData);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contact information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContactsByPeriod = () => {
    const now = new Date();
    let startDate = new Date();

    switch (timePeriod) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filtered = contacts.filter(contact => new Date(contact.started_at) >= startDate);
    setFilteredContacts(filtered);
  };

  const exportToSpreadsheet = () => {
    const csvData = filteredContacts.map(contact => {
      const data = contact.collected_data || {};
      return {
        Date: new Date(contact.started_at).toLocaleDateString(),
        Time: new Date(contact.started_at).toLocaleTimeString(),
        'Phone Number': contact.from_number,
        Name: (typeof data === 'object' && data?.name) || '',
        'Contact Phone': (typeof data === 'object' && data?.phone) || '',
        Email: (typeof data === 'object' && data?.email) || '',
        Message: (typeof data === 'object' && data?.message) || ''
      };
    });

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-contacts-${timePeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Contact data has been exported to CSV",
    });
  };

  const clearAllData = async () => {
    if (twoFactorCode !== "123456") { // Mock 2FA code
      toast({
        title: "Invalid Code",
        description: "Please enter the correct 2FA code",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({ collected_data: {} })
        .in('call_id', contacts.map(c => c.call_id));

      if (error) throw error;

      setContacts([]);
      setFilteredContacts([]);
      setShowClearDialog(false);
      setTwoFactorCode("");

      toast({
        title: "Data Cleared",
        description: "All customer contact data has been cleared",
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: "Failed to clear contact data",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
      return match ? `+1 (${match[1]}) ${match[2]}-${match[3]}` : phone;
    }
    return phone;
  };

  return (
    <div className="flex-1 space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Customer Contacts</h1>
          <p className="text-muted-foreground">Manage collected customer contact information</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" asChild>
            <Link to="/call-details">
              ← Back to Call Details
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/premium-features">
              <Shield className="h-4 w-4 mr-2" />
              Premium Features
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information ({filteredContacts.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={exportToSpreadsheet}
                disabled={filteredContacts.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>

              <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={contacts.length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear All Contact Data</DialogTitle>
                    <DialogDescription>
                      This action will permanently delete all customer contact information. Enter the 2FA code to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="password"
                      placeholder="Enter 2FA code (123456)"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        onClick={clearAllData}
                        disabled={!twoFactorCode}
                      >
                        Clear All Data
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowClearDialog(false);
                          setTwoFactorCode("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Caller Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(contact.started_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {formatPhoneNumber(contact.from_number)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(typeof contact.collected_data === 'object' && contact.collected_data?.name) ? (
                        <Badge variant="secondary">{contact.collected_data.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(typeof contact.collected_data === 'object' && contact.collected_data?.phone) ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {formatPhoneNumber(contact.collected_data.phone)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(typeof contact.collected_data === 'object' && contact.collected_data?.email) ? (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {contact.collected_data.email}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {(typeof contact.collected_data === 'object' && contact.collected_data?.message) ? (
                          <div className="text-sm truncate" title={contact.collected_data.message}>
                            {contact.collected_data.message}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredContacts.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No contact information found for the selected time period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerContacts;