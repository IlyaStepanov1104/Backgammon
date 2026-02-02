import { NextResponse } from 'next/server';
import { query } from '@/services/database';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/admin/export-cards
 * Exports all cards as a ZIP archive with the following structure:
 * - Card_ID_Title/
 *   - Позиция/
 *     - image.jpg
 *     - text.txt
 *   - Ход в партии/
 *     - image.jpg
 *     - text.txt
 *   - Лучший ход/
 *     - image.jpg
 *     - text.txt
 */
export async function GET() {
    try {
        // Fetch all cards from the database
        const cards = await query(`
            SELECT id, title, description, image_url, image_url_2, image_url_3,
                   correct_moves, position_description
            FROM cards
            ORDER BY id
        `);

        if (cards.length === 0) {
            return NextResponse.json({ error: 'No cards found' }, { status: 404 });
        }

        // Create archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Collect chunks
        const chunks = [];

        archive.on('data', (chunk) => {
            chunks.push(chunk);
        });

        const archivePromise = new Promise((resolve, reject) => {
            archive.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            archive.on('error', reject);
        });

        // Process each card
        for (const card of cards) {
            // Sanitize card title for folder name
            const sanitizedTitle = (card.title || 'Untitled')
                .replace(/[<>:"/\\|?*]/g, '_')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 50);

            const cardFolder = `${card.id}_${sanitizedTitle}`;

            // Structure mapping:
            // Позиция: image_url + description
            // Ход в партии: image_url_2 + position_description
            // Лучший ход: image_url_3 + correct_moves
            const sections = [
                {
                    name: 'Позиция',
                    imageUrl: card.image_url,
                    text: card.description
                },
                {
                    name: 'Ход в партии',
                    imageUrl: card.image_url_2,
                    text: card.position_description
                },
                {
                    name: 'Лучший ход',
                    imageUrl: card.image_url_3,
                    text: card.correct_moves
                }
            ];

            for (const section of sections) {
                // Skip section if no image and no text
                if (!section.imageUrl && !section.text) {
                    continue;
                }

                const sectionPath = `${cardFolder}/${section.name}`;

                // Add text file if text exists
                if (section.text) {
                    archive.append(section.text, {
                        name: `${sectionPath}/text.txt`
                    });
                }

                // Add image if exists
                if (section.imageUrl) {
                    const imagePath = getLocalImagePath(section.imageUrl);
                    if (imagePath && fs.existsSync(imagePath)) {
                        const ext = path.extname(imagePath) || '.jpg';
                        archive.file(imagePath, {
                            name: `${sectionPath}/image${ext}`
                        });
                    }
                }
            }
        }

        // Finalize the archive
        archive.finalize();

        // Wait for archive to complete
        const buffer = await archivePromise;

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `cards_export_${timestamp}.zip`;

        // Return the ZIP file
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length.toString()
            }
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({
            error: 'Export failed',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * Convert URL path to local file system path
 * @param {string} imageUrl - URL like /uploads/cards/xxx.jpg
 * @returns {string|null} - Local file path or null
 */
function getLocalImagePath(imageUrl) {
    if (!imageUrl) return null;

    // Handle local uploads
    if (imageUrl.startsWith('/uploads/')) {
        return path.join(process.cwd(), 'public', imageUrl);
    }

    // Handle full URLs (if stored as absolute paths)
    if (imageUrl.startsWith('http')) {
        // Extract path from URL if it's our own domain
        try {
            const url = new URL(imageUrl);
            if (url.pathname.startsWith('/uploads/')) {
                return path.join(process.cwd(), 'public', url.pathname);
            }
        } catch {
            return null;
        }
    }

    return null;
}
