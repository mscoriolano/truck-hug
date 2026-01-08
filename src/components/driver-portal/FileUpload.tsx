import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileImage, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  userId: string;
  onFilesUploaded: (urls: string[]) => void;
  existingFiles?: string[];
  maxFiles?: number;
  accept?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  userId,
  onFilesUploaded,
  existingFiles = [],
  maxFiles = 5,
  accept = 'image/*,.pdf,.doc,.docx',
}) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<string[]>(existingFiles);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: 'Limite de arquivos',
        description: `Máximo de ${maxFiles} arquivos permitidos`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(selectedFiles)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('driver-uploads')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('driver-uploads')
          .getPublicUrl(data.path);

        newUrls.push(urlData.publicUrl);
      }

      const updatedFiles = [...files, ...newUrls];
      setFiles(updatedFiles);
      onFilesUploaded(updatedFiles);

      toast({
        title: 'Upload concluído',
        description: `${newUrls.length} arquivo(s) enviado(s) com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesUploaded(updatedFiles);
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={accept}
        multiple
        className="hidden"
      />
      
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || files.length >= maxFiles}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? 'Enviando...' : 'Adicionar Foto/Arquivo'}
      </Button>

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((url, index) => (
            <div key={index} className="relative group">
              {isImage(url) ? (
                <img
                  src={url}
                  alt={`Arquivo ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border"
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center bg-muted rounded-lg border">
                  <File className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {files.length}/{maxFiles} arquivos • Formatos: imagens, PDF, Word
      </p>
    </div>
  );
};
