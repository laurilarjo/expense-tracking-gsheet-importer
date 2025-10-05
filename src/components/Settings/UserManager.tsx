import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { getAllBanks } from '@/lib/types/bank';
import { Bank } from '@/lib/types/bank';
import { generateUserSheetNames } from '@/lib/utils/sheet-naming';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export const UserManager: React.FC = () => {
  const { settings, addUser, updateUser, deleteUser } = useSettings();
  const { toast } = useToast();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserBanks, setNewUserBanks] = useState<Bank[]>([]);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserBanks, setEditingUserBanks] = useState<Bank[]>([]);

  const allBanks = getAllBanks();

  const handleAddUser = () => {
    if (!newUserName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a user name.",
        variant: "destructive",
      });
      return;
    }

    if (newUserBanks.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one bank for the user.",
        variant: "destructive",
      });
      return;
    }

    addUser({
      name: newUserName.trim(),
      allowedBanks: newUserBanks,
    });

    setNewUserName('');
    setNewUserBanks([]);
    setIsAddingUser(false);
    
    toast({
      title: "User Added",
      description: `${newUserName} has been added successfully.`,
    });
  };

  const handleEditUser = (userId: string) => {
    const user = settings.users.find(u => u.id === userId);
    if (user) {
      setEditingUserId(userId);
      setEditingUserName(user.name);
      setEditingUserBanks([...user.allowedBanks]);
    }
  };

  const handleSaveEdit = () => {
    if (!editingUserName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a user name.",
        variant: "destructive",
      });
      return;
    }

    if (editingUserBanks.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one bank for the user.",
        variant: "destructive",
      });
      return;
    }

    updateUser(editingUserId!, {
      name: editingUserName.trim(),
      allowedBanks: editingUserBanks,
    });

    setEditingUserId(null);
    setEditingUserName('');
    setEditingUserBanks([]);
    
    toast({
      title: "User Updated",
      description: `${editingUserName} has been updated successfully.`,
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      deleteUser(userId);
      toast({
        title: "User Deleted",
        description: `${userName} has been deleted.`,
      });
    }
  };

  const toggleBank = (bank: Bank, isEditing: boolean = false) => {
    if (isEditing) {
      setEditingUserBanks(prev => 
        prev.includes(bank) 
          ? prev.filter(b => b !== bank)
          : [...prev, bank]
      );
    } else {
      setNewUserBanks(prev => 
        prev.includes(bank) 
          ? prev.filter(b => b !== bank)
          : [...prev, bank]
      );
    }
  };

  const renderBankCheckboxes = (selectedBanks: Bank[], isEditing: boolean = false) => (
    <div className="grid grid-cols-2 gap-2">
      {allBanks.map(bank => (
        <div key={bank.id} className="flex items-center space-x-2">
          <Checkbox
            id={`${isEditing ? 'edit' : 'new'}-${bank.id}`}
            checked={selectedBanks.includes(bank.id)}
            onCheckedChange={() => toggleBank(bank.id, isEditing)}
          />
          <Label 
            htmlFor={`${isEditing ? 'edit' : 'new'}-${bank.id}`}
            className="text-sm"
          >
            {bank.name} ({bank.fileTypes.join(', ')})
          </Label>
        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Manage users and assign which banks they can use for file uploads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New User */}
        {!isAddingUser ? (
          <Button onClick={() => setIsAddingUser(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
        ) : (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">User Name</Label>
              <Input
                id="new-user-name"
                placeholder="Enter user name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Allowed Banks</Label>
              {renderBankCheckboxes(newUserBanks, false)}
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleAddUser} disabled={!newUserName.trim() || newUserBanks.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                Save User
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingUser(false);
                  setNewUserName('');
                  setNewUserBanks([]);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing Users */}
        {settings.users.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No users configured yet. Add your first user above.
          </div>
        ) : (
          <div className="space-y-4">
            {settings.users.map(user => (
              <div key={user.id} className="border rounded-lg p-4">
                {editingUserId === user.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-user-name">User Name</Label>
                      <Input
                        id="edit-user-name"
                        value={editingUserName}
                        onChange={(e) => setEditingUserName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Allowed Banks</Label>
                      {renderBankCheckboxes(editingUserBanks, true)}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Generated Sheet Names:</Label>
                      <div className="text-sm text-muted-foreground">
                        {generateUserSheetNames(editingUserName, editingUserBanks).map(sheetName => (
                          <div key={sheetName} className="font-mono">• {sheetName}</div>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={handleSaveEdit} disabled={!editingUserName.trim() || editingUserBanks.length === 0}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditingUserId(null);
                          setEditingUserName('');
                          setEditingUserBanks([]);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{user.name}</h3>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Allowed Banks:</Label>
                      <div className="text-sm text-muted-foreground">
                        {user.allowedBanks.map(bankId => {
                          const bank = allBanks.find(b => b.id === bankId);
                          return bank ? `${bank.name} (${bank.fileTypes.join(', ')})` : bankId;
                        }).join(', ')}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Generated Sheet Names:</Label>
                      <div className="text-sm text-muted-foreground">
                        {generateUserSheetNames(user.name, user.allowedBanks).map(sheetName => (
                          <div key={sheetName} className="font-mono">• {sheetName}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
