'use client';

import React from 'react'

interface AnimeFileUploadProps {
    cover: File | null
    screenshots: File[]
    setCover: (file: File | null) => void
    setScreenshots: (files: File[]) => void
}

const AnimeFileUpload: React.FC<AnimeFileUploadProps> = ({
                                                             cover,
                                                             screenshots,
                                                             setCover,
                                                             setScreenshots
                                                         }) => {
    return (
        <div className="file-upload-section">
            <h3>Загрузка файлов</h3>

            <div className="upload-block">
                <label>Обложка:
                    <input
                        type="file"
                        onChange={(e) => setCover(e.target.files?.[0] || null)}
                    />
                </label>
                {cover && (
                    <p className="file-name">Загружена: <strong>{cover.name}</strong></p>
                )}
            </div>

            <div className="upload-block">
                <label>Скриншоты (до 4):
                    <input
                        type="file"
                        multiple
                        onChange={(e) => setScreenshots(Array.from(e.target.files || []))}
                    />
                </label>
                {screenshots.length > 0 && (
                    <ul className="screenshot-list">
                        {screenshots.map((file, index) => (
                            <li key={index}>{file.name}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

export default AnimeFileUpload