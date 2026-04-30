/**
 * @typedef {Object} PokemonAreaDetail
 * @property {string} name
 * @property {string=} iconUrl
 */

/**
 * @typedef {Object} PokemonFavoriteDetail
 * @property {string} name
 * @property {string=} id
 */

/**
 * @typedef {Object} PokemonSpecialtyDetail
 * @property {string} name
 * @property {string=} id
 * @property {string=} description
 * @property {string=} iconUrl
 * @property {string=} litterItemName
 * @property {string=} litterItemIconUrl
 */

/**
 * @typedef {Object} PokemonMeta
 * @property {string=} rarity
 * @property {string[]} types
 * @property {string=} spriteUrl
 * @property {string[]} habitatIds
 * @property {PokemonAreaDetail[]} areaDetails
 * @property {PokemonFavoriteDetail[]} favoriteDetails
 * @property {PokemonSpecialtyDetail[]} specialtyDetails
 */

/**
 * @typedef {Object} PokemonRecord
 * @property {string} number
 * @property {string} name
 * @property {string} primaryLocation
 * @property {string} idealHabitat
 * @property {string[]} specialties
 * @property {string[]} favorites
 * @property {string[]} habitatAttractions
 * @property {string[]} availableAreas
 * @property {PokemonMeta=} meta
 */

/**
 * @typedef {Object} PokemonDataset
 * @property {string} generatedAt
 * @property {string} sourceFile
 * @property {{enabled:boolean,sourceDir:string,favoriteCatalogCount:number,specialtyCatalogCount:number,sourceRows:number,matchedPokemon:number,unmatchedPokemon:number,missingFavoriteIds:number,missingSpecialtyIds:number}=} enrichment
 * @property {number} count
 * @property {{idealHabitats:string[],primaryLocations:string[],favorites:string[],specialties:string[]}} facets
 * @property {PokemonRecord[]} pokemon
 */

export {};
