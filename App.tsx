import React, { useState, useCallback, ChangeEvent, FormEvent, useEffect } from 'react';
import { describeImageStyle, generateStyledImage, generatePromptFromKeywords } from './services/geminiService';
import { AspectRatio, LightingStyle, CameraPerspective } from './types';
import { ASPECT_RATIOS, LIGHTING_STYLES, CAMERA_PERSPECTIVES } from './constants';

const Spinner: React.FC = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const App: React.FC = () => {
  const [productImage, setProductImage] = useState<File | null>(null);
  const [styleImage, setStyleImage] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [lightingStyle, setLightingStyle] = useState<LightingStyle>('Studio');
  const [cameraPerspective, setCameraPerspective] = useState<CameraPerspective>('Eye-level');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [styleImagePreview, setStyleImagePreview] = useState<string | null>(null);

  useEffect(() => {
    // Clean up object URLs to avoid memory leaks
    return () => {
      if (productImagePreview) URL.revokeObjectURL(productImagePreview);
      if (styleImagePreview) URL.revokeObjectURL(styleImagePreview);
    };
  }, [productImagePreview, styleImagePreview]);

  const handleImageChange = (
    e: ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      // Create a new object URL. The old one will be cleaned up by the useEffect hook if a new image is selected.
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!productImage) {
      setError('Please upload a product image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      let finalPrompt = `Generate a professional, high-quality product photograph of the subject in the provided image. Adhere to the following constraints:
- Aspect Ratio: ${aspectRatio}
- Lighting Style: ${lightingStyle}
- Camera Perspective: ${cameraPerspective}`;

      if (styleImage) {
        const styleDescription = await describeImageStyle(styleImage);
        finalPrompt += `\n\n**Style Inspiration:** Emulate the visual style of the reference image, which is described as: *${styleDescription}*.`;
        if (prompt.trim()) {
            finalPrompt += `\n\n**User Refinements:** Additionally, apply these specific instructions: *${prompt.trim()}*.`;
        }
      } else if (prompt.trim()) {
        const styleDescription = await generatePromptFromKeywords(prompt.trim());
        finalPrompt += `\n\n**Style Inspiration:** Emulate the following visual style: *${styleDescription}*.`;
      }
      
      const result = await generateStyledImage(productImage, finalPrompt);
      setGeneratedImage(result);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [productImage, styleImage, prompt, aspectRatio, lightingStyle, cameraPerspective]);

  const ImageUpload: React.FC<{
    id: string;
    label: string;
    preview: string | null;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    helpText: string;
  }> = ({ id, label, preview, onChange, onClear, helpText }) => (
    <div className="mb-6">
      <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-300">{label}</label>
      <div className="relative group w-full">
        {preview && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500 z-10"
            aria-label="Remove image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
        <label htmlFor={id} className={`flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 relative overflow-hidden ${preview ? 'border-solid' : ''}`}>
          {preview ? (
            <img src={preview} alt="Preview" className="object-contain h-full w-full" />
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
              <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-400">PNG, JPG, or WEBP</p>
            </div>
          )}
          <input 
            id={id} 
            type="file" 
            className="hidden" 
            accept="image/png, image/jpeg, image/webp" 
            onChange={(e) => {
              onChange(e);
              e.target.value = '';
            }} 
          />
        </label>
      </div>
       <p className="mt-1 text-xs text-gray-500">{helpText}</p>
    </div>
  );
  
  const SelectControl: React.FC<{
    id: string;
    label: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    options: readonly string[];
  }> = ({ id, label, value, onChange, options }) => (
    <div className="mb-4">
      <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-300">{label}</label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
      >
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="bg-gray-800 p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center text-white">AI Photo Studio</h1>
      </header>

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          
          {/* Controls Column */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg h-fit">
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Styling Controls</h2>
            <form onSubmit={handleSubmit}>
              <ImageUpload
                id="product-image"
                label="1. Upload Product Image (Required)"
                preview={productImagePreview}
                onChange={(e) => handleImageChange(e, setProductImage, setProductImagePreview)}
                onClear={() => {
                  setProductImage(null);
                  setProductImagePreview(null);
                }}
                helpText="This is the main subject of your photo."
              />
              
              <div className="mb-4 p-4 border border-gray-700 rounded-lg bg-gray-900/50">
                <h3 className="text-lg font-medium mb-3 text-gray-200">2. Define Your Style</h3>
                <p className="text-sm text-gray-400 mb-4">You can provide a style reference image, keywords, or both for inspiration.</p>

                <ImageUpload
                  id="style-image"
                  label="Style Reference Image (Optional)"
                  preview={styleImagePreview}
                  onChange={(e) => handleImageChange(e, setStyleImage, setStyleImagePreview)}
                  onClear={() => {
                    setStyleImage(null);
                    setStyleImagePreview(null);
                  }}
                  helpText="Upload an image to match its visual style."
                />

                <div className="mb-4">
                  <label htmlFor="prompt" className="block mb-2 text-sm font-medium text-gray-300">Style Prompt / Keywords (Optional)</label>
                  <textarea
                    id="prompt"
                    rows={3}
                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    placeholder="e.g., 'Minimalist, bright, on a marble surface' or 'dark and moody, dramatic shadows'"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  ></textarea>
                   <p className="mt-1 text-xs text-gray-500">Describe the desired aesthetic or add specific elements.</p>
                </div>
              </div>

              <div className="mb-4 p-4 border border-gray-700 rounded-lg bg-gray-900/50">
                 <h3 className="text-lg font-medium mb-3 text-gray-200">3. Composition & Lighting</h3>
                  <SelectControl
                    id="aspect-ratio"
                    label="Aspect Ratio"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    options={ASPECT_RATIOS}
                  />

                  <SelectControl
                    id="lighting-style"
                    label="Lighting Style"
                    value={lightingStyle}
                    onChange={(e) => setLightingStyle(e.target.value as LightingStyle)}
                    options={LIGHTING_STYLES}
                  />
                  
                  <SelectControl
                    id="camera-perspective"
                    label="Camera Perspective"
                    value={cameraPerspective}
                    onChange={(e) => setCameraPerspective(e.target.value as CameraPerspective)}
                    options={CAMERA_PERSPECTIVES}
                  />
              </div>

              <button
                type="submit"
                className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-blue-600 border border-transparent rounded-md font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={isLoading || !productImage}
              >
                {isLoading ? <><Spinner /> Generating...</> : 'Generate Image'}
              </button>

              {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}
            </form>
          </div>

          {/* Results Column */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center justify-start h-fit">
            <h2 className="text-xl font-semibold mb-4 w-full text-center border-b border-gray-700 pb-2">Generated Result</h2>
             <div className="w-full aspect-square flex items-center justify-center bg-gray-900/50 rounded-lg overflow-hidden">
                {isLoading && (
                    <div className="flex flex-col items-center text-center p-4">
                        <Spinner />
                        <p className="mt-4 text-gray-400">Generating your masterpiece...</p>
                        <p className="text-sm text-gray-500">This can take a moment.</p>
                    </div>
                )}
                {!isLoading && generatedImage && (
                    <img src={generatedImage} alt="Generated result" className="object-contain max-w-full max-h-full" />
                )}
                {!isLoading && !generatedImage && (
                    <div className="text-center text-gray-500 p-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="mt-2 font-semibold">Your generated image will appear here.</p>
                        <p className="text-sm">Adjust the settings and click "Generate Image" to start.</p>
                    </div>
                )}
            </div>
            {generatedImage && !isLoading && (
              <a 
                href={generatedImage} 
                download="generated-image.png" 
                className="mt-4 inline-flex items-center px-6 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                Download Image
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;