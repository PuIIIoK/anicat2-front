'use client';

import React, { useEffect, useState } from 'react'
import {API_SERVER} from "../../../tools/constants";

interface Anime {
    id: number
    title: string
}

interface RawCategory {
    id: number
    name: string
    animeIds: number[]
}

interface Category {
    id: number
    name: string
    animes: Anime[]
}

export default function AdminCategory() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch(`${API_SERVER}/api/anime/category/get-category`)
                const data = await res.json()

                const rawCategories: RawCategory[] = data.categories

                const processedCategories: Category[] = await Promise.all(
                    rawCategories.map(async (rawCat) => {
                        const animes: Anime[] = await Promise.all(
                            rawCat.animeIds.map(async (animeId) => {
                                const res = await fetch(`${API_SERVER}/api/anime/get-anime/${animeId}`)
                                if (!res.ok) return { id: animeId, title: '❌ Не найдено' }
                                const animeData = await res.json()
                                return { id: animeData.id, title: animeData.title }
                            })
                        )

                        return {
                            id: rawCat.id,
                            name: rawCat.name,
                            animes,
                        }
                    })
                )

                setCategories(processedCategories)
                setLoading(false)
            } catch (err) {
                console.error('Ошибка при загрузке категорий:', err)
                setLoading(false)
            }
        }

        fetchCategories()
    }, [])

    if (loading) {
        return <div className="admin-category-loading">Загрузка категорий...</div>
    }

    return (
        <div className="admin-category-container">
            {categories.map((category) => (
                <div key={category.id} className="admin-category-block">
                    <h2 className="admin-category-name">{category.name}</h2>
                    {category.animes.length === 0 ? (
                        <p className="admin-category-empty">Нет аниме в этой категории</p>
                    ) : (
                        <ul className="admin-category-anime-list">
                            {category.animes.map((anime) => (
                                <li key={anime.id} className="admin-category-anime-item">
                                    {anime.title}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    )
}
