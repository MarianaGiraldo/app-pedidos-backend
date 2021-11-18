import {service} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {error} from 'util';
import {Persona} from '../models';
import {PersonaRepository} from '../repositories';
import {AutenticacionService} from '../services';
// import fetch from 'node-fetch';
const generador = require("password-generator")
const cryptoJS = require("crypto-js")

export class PersonaController {
  constructor(
    @repository(PersonaRepository)
    public personaRepository: PersonaRepository,

    @service(AutenticacionService)
    public servicioAutenticacion = AutenticacionService,
  ) {}

  @post('/personas')
  @response(200, {
    description: 'Persona model instance',
    content: {'application/json': {schema: getModelSchemaRef(Persona)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Persona, {
            title: 'NewPersona',
            exclude: ['id'],
          }),
        },
      },
    })
    persona: Omit<Persona, 'id'>,
  ): Promise<Persona> {
    //let clave = this.servicioAutenticacion.GenerarClave();
    let clave = generador(8, false);
    //let claveCifrada = this.servicioAutenticacion.CifrarClave(clave);
    let claveCifrada = cryptoJS.MD5(clave).toString();
    persona.clave = claveCifrada;
    let p =  await this.personaRepository.create(persona);
    console.log(p)

    //Notificar al usuario
    let destino = persona.correo;
    let asunto = 'Registro en la plataforma';
    let contenido = `Hola ${persona.nombres}, su nombre de usuario es: ${persona.correo} y tu contraseña es: ${clave} `;
    let fetchUrl = `http://127.0.0.1:5000/envio-correo?correo-destino=${destino}&asunto=${asunto}&contenido=${contenido}`;
    (async () => {
      try {
        import('node-fetch').then(async function ({default: fetch}) {
            return await fetch(fetchUrl).then((data:any) => console.log(data));
          }).catch();
      } catch (error) {
        if (error.name === 'ERR_REQUIRE_ESM') {
          console.log('request was aborted');
        }
        console.log(error.message)
      }
    });

    return p;
  }

  @get('/personas/count')
  @response(200, {
    description: 'Persona model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(Persona) where?: Where<Persona>): Promise<Count> {
    return this.personaRepository.count(where);
  }

  @get('/personas')
  @response(200, {
    description: 'Array of Persona model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Persona, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Persona) filter?: Filter<Persona>,
  ): Promise<Persona[]> {
    return this.personaRepository.find(filter);
  }

  @patch('/personas')
  @response(200, {
    description: 'Persona PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Persona, {partial: true}),
        },
      },
    })
    persona: Persona,
    @param.where(Persona) where?: Where<Persona>,
  ): Promise<Count> {
    return this.personaRepository.updateAll(persona, where);
  }

  @get('/personas/{id}')
  @response(200, {
    description: 'Persona model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Persona, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Persona, {exclude: 'where'})
    filter?: FilterExcludingWhere<Persona>,
  ): Promise<Persona> {
    return this.personaRepository.findById(id, filter);
  }

  @patch('/personas/{id}')
  @response(204, {
    description: 'Persona PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Persona, {partial: true}),
        },
      },
    })
    persona: Persona,
  ): Promise<void> {
    await this.personaRepository.updateById(id, persona);
  }

  @put('/personas/{id}')
  @response(204, {
    description: 'Persona PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() persona: Persona,
  ): Promise<void> {
    await this.personaRepository.replaceById(id, persona);
  }

  @del('/personas/{id}')
  @response(204, {
    description: 'Persona DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.personaRepository.deleteById(id);
  }
}


